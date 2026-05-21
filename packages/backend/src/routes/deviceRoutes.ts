import type { FastifyInstance } from 'fastify';
import { Device } from '../models/Device.js';
import { DeviceStats } from '../models/DeviceStats.js';
import { DeviceEvent } from '../models/DeviceEvent.js';
import { syncDeviceLogs } from '../services/logService.js';
import { type IDeviceInfo } from '../../../shared/types.js';
import { 
    resolveScript, 
    getPythonCommand, 
    pythonEnv, 
    extractJson, 
    execAsync, 
    EXEC_MAX_BUFFER 
} from '../utils/pythonUtils.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const isProduction = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DINÁMICA (Seguridad)
// ─────────────────────────────────────────────────────────────

/** 
 * Store global para credenciales que pueden venir de Electron (safeStorage)
 * o de variables de entorno por defecto.
 */
let globalConfig = {
  TUYA_API_KEY: process.env.TUYA_API_KEY || '',
  TUYA_API_SECRET: process.env.TUYA_API_SECRET || '',
  TUYA_API_REGION: process.env.TUYA_API_REGION || 'eu',
};

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface PortConflict {
  port: number;
  pid: number;
  name: string;
}

interface GetDeviceParams {
  id: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

/** Puertos UDP/TCP que tinytuya necesita para el escaneo de red local. */
const TUYA_PORTS = [6666, 6667, 7000] as const;

/**
 * Detecta qué procesos del sistema operativo están ocupando los puertos de Tuya.
 * Soporta Windows (netstat + tasklist) y Unix/macOS (lsof + ps).
 */
async function checkTuyaPorts(): Promise<PortConflict[]> {
  const isWindows = os.platform() === 'win32';
  const conflicts: PortConflict[] = [];

  for (const port of TUYA_PORTS) {
    try {
      let pid: number | null = null;
      let procName = 'Proceso desconocido';

      if (isWindows) {
        const { stdout } = await execAsync(
          `netstat -ano | findstr ":${port} "`,
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));

        for (const line of stdout.trim().split('\n').filter(Boolean)) {
          const parts = line.trim().split(/\s+/);
          if ((parts[1] ?? '').endsWith(`:${port}`)) {
            const rawPid = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(rawPid) && rawPid > 0) { pid = rawPid; break; }
          }
        }

        if (pid) {
          const { stdout: tl } = await execAsync(
            `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
            { timeout: 5000 }
          ).catch(() => ({ stdout: '' }));
          const match = tl.match(/"([^"]+)"/);
          if (match) procName = match[1];
        }
      } else {
        const { stdout } = await execAsync(
          `lsof -i :${port} -t`,
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));

        const rawPid = parseInt(stdout.trim().split('\n')[0], 10);
        if (!isNaN(rawPid) && rawPid > 0) pid = rawPid;

        if (pid) {
          const { stdout: ps } = await execAsync(
            `ps -p ${pid} -o comm=`,
            { timeout: 5000 }
          ).catch(() => ({ stdout: '' }));
          procName = ps.trim() || procName;
        }
      }

      if (pid) conflicts.push({ port, pid, name: procName });
    } catch {
      // Si un puerto falla al comprobarse, se asume libre.
    }
  }

  // Deduplicar: un mismo proceso puede ocupar varios puertos Tuya.
  const seen = new Set<string>();
  return conflicts.filter(c => {
    const key = `${c.pid}-${c.port}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });
}

/**
 * Termina forzosamente los procesos indicados por PID.
 * Soporta Windows (taskkill /F) y Unix/macOS (kill -9).
 */
async function killProcesses(pids: number[]): Promise<{ killed: number[]; failed: number[] }> {
  const isWindows = os.platform() === 'win32';
  const killed: number[] = [];
  const failed: number[] = [];

  for (const pid of pids) {
    try {
      const cmd = isWindows ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
      await execAsync(cmd, { timeout: 5000 });
      killed.push(pid);
    } catch {
      failed.push(pid);
    }
  }

  return { killed, failed };
}

/**
 * Ejecuta el escáner NVD para un dispositivo y guarda el resultado en la BD.
 */
async function performSecurityScan(device: any) {
  const manufacturer = device.attributes?.manufacturer || device.name.split(' ')[0] || 'Unknown';
  const model = device.attributes?.model || device.name || 'Device';
  const version = device.attributes?.version || '';

  console.log(`[Security] Iniciando escaneo para ${device.name} (${manufacturer} ${model})...`);
  
  const scriptPath = resolveScript('nvd_scanner.py');
  try {
    const { stdout } = await execAsync(
      `${getPythonCommand(scriptPath)} "${manufacturer}" "${model}" "${version}"`,
      { env: pythonEnv(), maxBuffer: EXEC_MAX_BUFFER }
    );

    const result = extractJson(stdout) as any;
    if (result && (result as any).estado === 'OK') {
      await Device.updateOne(
        { _id: device._id },
        { $set: { 
            'attributes.security': result, 
            'attributes.lastSecurityScan': new Date(),
            'attributes.manufacturer': manufacturer,
            'attributes.model': model
          } 
        }
      );
      return result;
    }
    return { error: (result as any)?.estado || 'Error desconocido' };
  } catch (e: any) {
    console.error(`[Security ERROR] Fallo escaneo para ${device._id}:`, e.message);
    return { error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────────────────────

export default async function deviceRoutes(fastify: FastifyInstance) {

  // ── GET /devices/ ────────────────────────────────────────────
  // Devuelve todos los dispositivos de la BD. Si tienen credenciales
  // locales (IP + LocalKey), consulta su estado en vivo vía UDP y
  // actualiza status/dps en la BD en background.
  fastify.get<{ Reply: IDeviceInfo[] }>('/', async (_request, _reply) => {
    let devices = (await Device.find()
      .select('name type connectionType status image owner attributes createdAt updatedAt')
      .lean()) as any[];

    const queryData = devices
      .map(d => ({
        _id: d._id.toString(),
        tuyaId: d.attributes?.tuyaId,
        ip: d.attributes?.ip,
        localKey: d.attributes?.localKey,
        version: d.attributes?.version ?? '3.3',
      }))
      .filter(d => d.tuyaId && d.ip && d.localKey);

    if (queryData.length > 0) {
      const tempFile = path.join(os.tmpdir(), `sc_query_${Date.now()}.json`);
      try {
        console.log(`[IoT] Consultando estado en vivo de ${queryData.length} dispositivo(s)...`);
        await fs.writeFile(tempFile, JSON.stringify(queryData), 'utf-8');

        const scriptPath = resolveScript('get_statuses.py');
        const { stdout } = await execAsync(
          `${getPythonCommand(scriptPath)} "${tempFile}"`,
          { env: pythonEnv(), maxBuffer: EXEC_MAX_BUFFER }
        );

        const result = extractJson(stdout) as any;
        if (result.success && Array.isArray(result.results)) {
          for (const live of result.results) {
            const idx = devices.findIndex(d => d._id.toString() === live._id);
            if (idx === -1) continue;

            if (live.success && live.dps) {
              devices[idx].status = 'online';
              devices[idx].attributes = { ...devices[idx].attributes, dps: live.dps };
              Device.updateOne(
                { _id: devices[idx]._id },
                { $set: { status: 'online', 'attributes.dps': live.dps } }
              ).exec().catch(() => {});
            } else {
              devices[idx].status = 'offline';
              Device.updateOne({ _id: devices[idx]._id }, { $set: { status: 'offline' } })
                .exec().catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn('[IoT] Fallo al consultar estados en paralelo:', (e as Error).message);
      } finally {
        await fs.unlink(tempFile).catch(() => {});
      }
    }

    return devices.map(d => ({ ...d, _id: d._id.toString() })) as IDeviceInfo[];
  });

  // ── POST /devices/ ───────────────────────────────────────────
  // Crea un dispositivo manualmente (sin escaneo).
  fastify.post<{ Body: IDeviceInfo; Reply: IDeviceInfo }>('/', async (request, _reply) => {
    const { name, type, connectionType, image, owner } = request.body;
    const saved = await new Device({ name, type, connectionType, image, owner }).save();
    const obj = saved.toObject();
    return { ...obj, _id: obj._id.toString() };
  });

  // ── GET /devices/check-ports ─────────────────────────────────
  // Comprueba si los puertos de Tuya están libres.
  fastify.get('/check-ports', async () => {
    const conflicts = await checkTuyaPorts();
    return { conflicts };
  });

  // ── POST /devices/kill-ports ─────────────────────────────────
  // Termina los procesos que bloquean los puertos de Tuya.
  fastify.post<{ Body: { pids: number[] } }>('/kill-ports', async (request, reply) => {
    const { pids } = request.body;
    if (!Array.isArray(pids) || pids.length === 0) {
      return reply.status(400).send({ error: 'Debes enviar un array de PIDs.' });
    }

    console.log(`[IoT] Cerrando procesos con PIDs: ${pids.join(', ')}`);
    const result = await killProcesses(pids);

    // Pausa para que el SO libere los sockets antes de reanudad el escaneo.
    await new Promise(r => setTimeout(r, 800));

    return result;
  });

  // ── POST /devices/scan ───────────────────────────────────────
  // Escanea la red local con tinytuya, cruza los resultados con
  // Tuya Cloud y devuelve los dispositivos nuevos (no en la BD).
  // Devuelve 409 si algún puerto está ocupado.
  fastify.post('/scan', async (_request, reply) => {
    console.log('[IoT] Iniciando escaneo de red local con tinytuya...');

    try {
      const conflicts = await checkTuyaPorts();
      if (conflicts.length > 0) {
        console.warn('[IoT] Puertos Tuya bloqueados:', conflicts.map(c => `${c.port} (PID ${c.pid})`));
        return reply.status(409).send({
          portConflict: true,
          blockedBy: conflicts,
          message: `Los puertos ${TUYA_PORTS.join(', ')} están siendo usados por otras aplicaciones.`,
        });
      }

      const snapshotPath = path.resolve(process.cwd(), 'snapshot.json');

      console.log('[IoT] Ejecutando escáner de red...');
      const scanScript = resolveScript('tuya_scan_native.py');
      await execAsync(
        `${getPythonCommand(scanScript)} -snapshot-file "${snapshotPath}"`,
        { maxBuffer: EXEC_MAX_BUFFER }
      );

      // Leer snapshot generado por tinytuya
      let scanData: { devices: any[] } = { devices: [] };
      try {
        scanData = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
      } catch {
        console.warn('[IoT] Snapshot vacío o inválido — la red puede no tener dispositivos Tuya.');
      }
      await fs.unlink(snapshotPath).catch(() => {});

      // Cruzar con datos de Tuya Cloud (nombre, icono, localKey)
      let cloudDevices: any[] = [];
      try {
        const cloudScript = resolveScript('cloud_scan.py');
        const { stdout: cloudOut } = await execAsync(
          `${getPythonCommand(cloudScript)}`,
          { env: pythonEnv(), maxBuffer: EXEC_MAX_BUFFER }
        );
        const match = cloudOut.match(/\[[\s\S]*\]/);
        if (match) cloudDevices = JSON.parse(match[0]);
      } catch (e) {
        console.warn('[IoT] Sin datos de nube para cross-match:', (e as Error).message);
      }

      // Merge local + cloud
      const foundDevices = (scanData.devices as any[]).map((d, idx) => {
        const cloud = cloudDevices.find((c: any) => c.id === d.id);
        const suffix = String(d.id).slice(-4).toUpperCase();
        return {
          name: cloud?.name ?? d.name ?? `Dispositivo ${suffix}`,
          type: cloud?.category ?? d.dev_type ?? 'smart-device',
          connectionType: 'WiFi',
          status: 'online',
          image: cloud?.icon ?? `https://placehold.co/100x100/cyan/white?text=${idx + 1}`,
          params: {
            tuyaId: d.id,
            ip: d.ip,
            productKey: d.productKey,
            version: d.ver ?? d.version,
            localKey: cloud?.local_key,
            dps: cloud?.dps,
          },
        };
      });

      // Filtrar los que ya están en la BD
      const existing = await Device.find(
        { 'attributes.tuyaId': { $exists: true, $ne: null } },
        { 'attributes.tuyaId': 1, _id: 0 }
      ).lean();
      const existingIds = new Set(existing.map((d: any) => d.attributes?.tuyaId).filter(Boolean));

      const newDevices = foundDevices.filter(d => !existingIds.has(d.params.tuyaId));
      console.log(
        `[IoT] Escaneo completo: ${foundDevices.length} encontrados, ` +
        `${newDevices.length} nuevos, ${foundDevices.length - newDevices.length} ya añadidos.`
      );

      return { message: 'Escaneo finalizado', devices: newDevices };

    } catch (error: any) {
      console.error('[IoT ERROR] Fallo en escaneo:', error.message);
      return reply.status(500).send({ error: 'Error ejecutando el escáner de red.' });
    }
  });

  // ── POST /devices/pair ───────────────────────────────────────
  // Obtiene la LocalKey del dispositivo desde Tuya Cloud y lo guarda
  // en la BD como dispositivo vinculado.
  fastify.post('/pair', async (request, reply) => {
    const { deviceData } = request.body as any;

    if (!deviceData?.params?.tuyaId) {
      return reply.status(400).send({ error: 'Datos de dispositivo inválidos. Falta tuyaId.' });
    }

    const { tuyaId, ip, version, productKey } = deviceData.params;
    console.log(`[IoT] Emparejando [${deviceData.name}] (TuyaID: ${tuyaId})...`);

    const scriptPath = resolveScript('cloud_pair.py');

    try {
      const { stdout, stderr } = await execAsync(
        `${getPythonCommand(scriptPath)}`,
        { env: pythonEnv({ TUYA_DEVICE_ID: tuyaId }), maxBuffer: EXEC_MAX_BUFFER }
      );

      const result = extractJson(stdout) as any;

      if (result.error) {
        return reply.status(500).send({ error: result.error });
      }

      const localKey = result.local_key;
      console.log(`[IoT] LocalKey obtenida. Guardando en la BD...`);

      const saved = await new Device({
        name: deviceData.name,
        type: deviceData.type,
        connectionType: deviceData.connectionType,
        image: deviceData.image,
        status: 'online',
        attributes: {
          tuyaId,
          ip,
          version,
          localKey,
          productKey,
          dps: deviceData.params.dps ?? {},
        },
      }).save();

      // Lanzar escaneo de seguridad en background
      performSecurityScan(saved).catch(err => console.error("Error en escaneo inicial:", err));

      return { message: '¡Emparejado con éxito!', device: saved };

    } catch (error: any) {
      console.error('[IoT ERROR] Fallo al emparejar:', error.message);
      const details = (error.stdout ?? error.message ?? '').toString().substring(0, 150);
      return reply.status(500).send({ error: `Error del sistema: ${details}` });
    }
  });

  // ── GET /devices/:id/state ───────────────────────────────────
  // Solicita el estado en tiempo real de un dispositivo vía UDP local.
  // Si no tiene schema de DPs, lo descarga de Tuya Cloud y lo persiste.
  fastify.get<{ Params: GetDeviceParams; Reply: any }>('/:id/state', async (request, reply) => {
    const { id } = request.params;
    const device = await Device.findById(id).lean();

    if (!device) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

    const { tuyaId, ip, localKey, version, schema: storedSchema } = device.attributes ?? {};
    if (!tuyaId || !ip || !localKey) {
      return reply.status(400).send({ error: 'Faltan credenciales locales (tuyaId, ip, localKey).' });
    }

    console.log(`[IoT] Consultando estado en vivo de [${device.name}]...`);

    // Descargar schema de DPs si no está en la BD
    let schema = storedSchema;
    if (!schema && process.env.TUYA_API_REGION) {
      try {
        const schemaScript = resolveScript('get_schema.py');
        const { stdout } = await execAsync(
          `${getPythonCommand(schemaScript)}`,
          { env: pythonEnv({ TUYA_DEVICE_ID: tuyaId }), maxBuffer: EXEC_MAX_BUFFER }
        );
        const res = extractJson(stdout) as any;
        if (res.success && res.schema) {
          schema = res.schema;
          Device.updateOne({ _id: id }, { $set: { 'attributes.schema': schema } }).exec().catch(() => {});
        }
      } catch (e) {
        console.warn('[IoT] No se pudo obtener el schema:', (e as Error).message);
      }
    }

    // Consultar DPs en tiempo real
    const statusScript = resolveScript('get_status.py');
    try {
      const { stdout } = await execAsync(
        `${getPythonCommand(statusScript)}`,
        {
          env: pythonEnv({
            TUYA_DEVICE_ID: tuyaId,
            TUYA_IP: ip,
            TUYA_LOCAL_KEY: localKey,
            TUYA_VERSION: String(version ?? '3.3'),
          }),
          maxBuffer: EXEC_MAX_BUFFER,
        }
      );

      const result = extractJson(stdout) as any;
      if (result.error) {
        return reply.status(503).send({ error: result.error, offline: true });
      }

      return { success: true, dps: result.data?.dps ?? {}, schema: schema ?? [] };

    } catch (e: any) {
      console.error('[IoT ERROR] Fallo consultando estado:', e.message);
      return reply.status(503).send({ error: 'Error de red con el dispositivo.', offline: true });
    }
  });

  // ── POST /devices/:id/command ────────────────────────────────
  // Envía un comando DP (Data Point) a un dispositivo vía UDP local.
  fastify.post<{ Params: GetDeviceParams; Body: { dp: string; value: any }; Reply: any }>(
    '/:id/command',
    async (request, reply) => {
      const { id } = request.params;
      const { dp, value } = request.body;

      const device = await Device.findById(id).lean();
      if (!device) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

      const { tuyaId, ip, localKey, version } = device.attributes ?? {};
      if (!tuyaId || !ip || !localKey) {
        return reply.status(400).send({ error: 'Faltan credenciales locales para enviar comando.' });
      }

      const cmdScript = resolveScript('send_command.py');
      try {
        const { stdout } = await execAsync(
          `${getPythonCommand(cmdScript)}`,
          {
            env: pythonEnv({
              TUYA_DEVICE_ID: tuyaId,
              TUYA_IP: ip,
              TUYA_LOCAL_KEY: localKey,
              TUYA_VERSION: String(version ?? '3.3'),
              TUYA_DP: dp,
              TUYA_VALUE: String(value),
            }),
            maxBuffer: EXEC_MAX_BUFFER,
          }
        );

        const result = extractJson(stdout) as any;
        if (result.error) return reply.status(500).send(result);
        return { success: true, ...result };

      } catch (e: any) {
        console.error('[IoT ERROR] Fallo enviando comando:', e.message);
        return reply.status(500).send({ error: 'Error al enviar el comando al dispositivo.' });
      }
    }
  );

  // ── DELETE /devices/:id ──────────────────────────────────────
  // Elimina un dispositivo de la BD (desvinculación local).
  // El dispositivo físico no se ve afectado.
  fastify.delete<{ Params: GetDeviceParams }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const deleted = await Device.findByIdAndDelete(id);

    if (!deleted) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

    console.log(`[IoT] Dispositivo [${deleted.name}] (${id}) eliminado de la BD.`);
    return { success: true, message: `Dispositivo "${deleted.name}" desvinculado correctamente.` };
  });

  // ── PATCH /devices/:id ───────────────────────────────────────
  // Actualiza parcialmente un dispositivo (nombre, icono, etc.)
  fastify.patch<{ Params: GetDeviceParams; Body: Partial<IDeviceInfo> }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, image } = request.body;

    const updated = await Device.findByIdAndUpdate(
      id,
      { $set: { name, image } },
      { new: true }
    );

    if (!updated) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

    return { success: true, device: updated };
  });

  // ── POST /devices/:id/logs/sync ──────────────────────────────
  // Dispara una sincronización manual con Tuya Cloud y guarda en BBDD
  fastify.post<{ Params: GetDeviceParams }>('/:id/logs/sync', async (request, reply) => {
    const { id } = request.params;
    const result = await syncDeviceLogs(id);
    return result;
  });

  // ── GET /devices/:id/logs/db ──────────────────────────────────
  // Obtiene el historial de eventos almacenado localmente en nuestra BBDD
  fastify.get<{ Params: GetDeviceParams }>('/:id/logs/db', async (request, reply) => {
    const { id } = request.params;
    const logs = await DeviceEvent.find({ deviceId: id }).sort({ eventTime: -1 }).limit(1000).lean();
    return { success: true, logs };
  });

  // ── GET /devices/:id/logs/export ──────────────────────────────
  // Exporta el historial almacenado en la BBDD a formato CSV
  fastify.get<{ Params: GetDeviceParams }>('/:id/logs/export', async (request, reply) => {
    const { id } = request.params;
    const device = await Device.findById(id).lean();
    if (!device) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

    const logs = await DeviceEvent.find({ deviceId: id }).sort({ eventTime: -1 }).lean();
    
    // Cabeceras del CSV
    let csv = '\uFEFF' + 'Fecha,Hora,Parámetro,ID (DP),Valor Registrado\n';
    
    for (const log of logs) {
      const dt = new Date(log.eventTime);
      const fecha = dt.toLocaleDateString('es-ES');
      const hora = dt.toLocaleTimeString('es-ES');
      
      // Intentamos formatear el valor y el código
      let valStr = String(log.value);
      if (typeof log.value === 'boolean') valStr = log.value ? 'ON' : 'OFF';
      
      csv += `"${fecha}","${hora}","${log.code}","${log.code}","${valStr}"\n`;
    }

    const fileName = `Historial_${device.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${fileName}"`)
      .send(csv);
  });

  // ── GET /devices/:id/logs ────────────────────────────────────
  // Obtiene el historial de eventos del dispositivo desde Tuya Cloud
  fastify.get<{ Params: GetDeviceParams }>('/:id/logs', async (request, reply) => {
    const { id } = request.params;
    const device = await Device.findById(id).lean();

    if (!device) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

    const tuyaId = device.attributes?.tuyaId;
    if (!tuyaId) return reply.status(400).send({ error: 'El dispositivo no tiene un Tuya ID vinculado.' });

    console.log(`[IoT] Obteniendo historial para ${device.name} (${tuyaId})...`);

    const scriptPath = resolveScript('get_logs.py');
    try {
      const { stdout } = await execAsync(
        `${getPythonCommand(scriptPath)}`,
        { 
          env: pythonEnv({ TUYA_DEVICE_ID: tuyaId }),
          maxBuffer: EXEC_MAX_BUFFER 
        }
      );

      const result = extractJson(stdout) as any;
      if (result.error) return reply.status(500).send(result);

      // Tuya devuelve { success: true, result: { logs: [...] } } o similar
      return result;

    } catch (e: any) {
      console.error('[IoT ERROR] Fallo obteniendo logs:', e.message);
      return reply.status(500).send({ error: 'Error al obtener el historial de la nube.' });
    }
  });

  // ── POST /devices/upload ─────────────────────────────────────
  // Sube una imagen personalizada para un icono de dispositivo.
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No se recibió ningún archivo.' });

    // Validaciones de seguridad
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(415).send({ error: 'Tipo de archivo no permitido. Usa JPG, PNG, WebP o SVG.' });
    }

    // Generar nombre seguro (timestamp + random hex + extensión)
    const ext = path.extname(data.filename) || `.${data.mimetype.split('/')[1]}`;
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads');
    const savePath = path.join(uploadDir, safeName);

    try {
      // Guardar archivo usando streams para eficiencia
      await pipeline(data.file, createWriteStream(savePath));

      // La URL resultante será relativa al servidor (ej: /uploads/nombre.png)
      // O absoluta si incluimos el host, pero relativa es más flexible para Electron/CORS
      const fileUrl = `/uploads/${safeName}`;

      console.log(`[Upload] Archivo guardado: ${savePath} -> ${fileUrl}`);
      return { success: true, url: fileUrl };
    } catch (err) {
      console.error('[Upload ERROR]', err);
      return reply.status(500).send({ error: 'Fallo al guardar el archivo en el servidor.' });
    }
  });

  // ── POST /devices/config ─────────────────────────────────────
  // Actualiza la configuración dinámica (inyecta keys desde Electron)
  fastify.post('/config', async (request, reply) => {
    const { TUYA_API_KEY, TUYA_API_SECRET, TUYA_API_REGION } = request.body as any;
    
    if (TUYA_API_KEY) globalConfig.TUYA_API_KEY = TUYA_API_KEY;
    if (TUYA_API_SECRET) globalConfig.TUYA_API_SECRET = TUYA_API_SECRET;
    if (TUYA_API_REGION) globalConfig.TUYA_API_REGION = TUYA_API_REGION;

    console.log(`[Config] Credenciales actualizadas dinámicamente (${globalConfig.TUYA_API_REGION})`);
    return { success: true };
  });

  // ── GET /devices/bluetooth/scan ──────────────────────────────
  fastify.get('/bluetooth/scan', async (_request, reply) => {
    const scriptPath = resolveScript('bluetooth_manager.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} scan`, { env: pythonEnv() });
      return JSON.parse(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── GET /devices/bluetooth/state ──────────────────────────────
  fastify.get<{ Querystring: { deviceId?: string; deviceName?: string } }>('/bluetooth/state', async (request, reply) => {
    const { deviceId, deviceName } = request.query;
    const scriptPath = resolveScript('bluetooth_manager.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} state`, { 
        env: pythonEnv({ BT_DEVICE_ID: deviceId || '', BT_DEVICE_NAME: deviceName || '' }) 
      });
      return JSON.parse(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── POST /devices/bluetooth/connect ──────────────────────────
  fastify.post<{ Body: { deviceId: string } }>('/bluetooth/connect', async (request, reply) => {
    const { deviceId } = request.body;
    const scriptPath = resolveScript('bluetooth_manager.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} connect ${deviceId}`, { env: pythonEnv() });
      const res = JSON.parse(stdout);
      if (res.error) return reply.status(400).send(res);
      return res;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── POST /devices/bluetooth/command ──────────────────────────
  fastify.post<{ Body: { command: string; value?: any; deviceName?: string; deviceId?: string } }>('/bluetooth/command', async (request, reply) => {
    const { command, value, deviceName, deviceId } = request.body;
    const scriptPath = resolveScript('bluetooth_manager.py');
    try {
      const { stdout } = await execAsync(
        `${getPythonCommand(scriptPath)} command ${command} ${value ?? ''}`, 
        { env: pythonEnv({ BT_DEVICE_NAME: deviceName || '', BT_DEVICE_ID: deviceId || '' }) }
      );
      const res = JSON.parse(stdout);
      if (res.error) {
        // Capturamos el ControlHardwareError del backend python
        if (res.type === 'ControlHardwareError') {
            return reply.status(400).send(res);
        }
        return reply.status(500).send(res);
      }
      return res;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── POST /devices/bluetooth/pair ──────────────────────────────
  fastify.post<{ Body: { name: string; id: string; type?: string } }>('/bluetooth/pair', async (request, _reply) => {
    const { name, id, type } = request.body;
    const existing = await Device.findOne({ 'attributes.bluetoothId': id });
    if (existing) {
        return existing;
    }
    const saved = await new Device({
      name,
      type: type || 'audio-device',
      connectionType: 'Bluetooth',
      status: 'online',
      attributes: {
        bluetoothId: id,
      }
    }).save();
    
    // Lanzar escaneo de seguridad en background
    performSecurityScan(saved).catch(err => console.error("Error en escaneo inicial BT:", err));

    return saved;
  });

  // ── GET /devices/analysis/mice ──────────────────────────────
  fastify.get('/analysis/mice', async (_request, reply) => {
    const scriptPath = resolveScript('mouse_sniffer.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} list`, { env: pythonEnv() });
      return JSON.parse(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── GET /devices/analysis/battery/:id ────────────────────────
  fastify.get<{ Params: { id: string } }>('/analysis/battery/:id', async (request, reply) => {
    const { id } = request.params;
    const scriptPath = resolveScript('mouse_sniffer.py');
    try {
      const { stdout } = await execAsync(`${getPythonCommand(scriptPath)} battery "${id}"`, { env: pythonEnv() });
      return JSON.parse(stdout);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── GET /devices/analysis/stream/:handle ──────────────────────
  fastify.get<{ Params: { handle: string }, Querystring: { id?: string } }>('/analysis/stream/:handle', (request, reply) => {
    const { handle } = request.params;
    const { id } = request.query;
    
    reply.hijack();
    const response = reply.raw;

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    const scriptPath = resolveScript('mouse_sniffer.py');
    const pythonProcess = isProduction 
      ? spawn(scriptPath, ['sniff', handle], { env: pythonEnv() })
      : spawn('python', [scriptPath, 'sniff', handle], { env: pythonEnv() });
    
    let sessionClicks = 0;
    let sessionDistance = 0;
    let lastSaveTime = Date.now();

    const saveStatsToDb = async () => {
      if (!id || (sessionClicks === 0 && sessionDistance === 0)) return;
      try {
        const device = await Device.findOne({ 'attributes.bluetoothId': id });
        if (device) {
          const stats = await DeviceStats.findOne({ deviceId: device._id }).sort({ timestamp: -1 });
          if (stats && (Date.now() - stats.timestamp.getTime() < 3600000)) {
            stats.clicks = (stats.clicks || 0) + sessionClicks;
            stats.distance = (stats.distance || 0) + sessionDistance;
            await stats.save();
          } else {
            await new DeviceStats({
              deviceId: device._id,
              status: 'online',
              clicks: sessionClicks,
              distance: sessionDistance
            }).save();
          }
        }
        sessionClicks = 0;
        sessionDistance = 0;
      } catch (e) {
        console.error("Error saving stream stats", e);
      }
    };

    pythonProcess.stdout.on('data', (data: Buffer) => {
      if (response.destroyed) return;
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            // Verify it's valid JSON before sending
            const payload = JSON.parse(line);
            if (!response.destroyed) {
              response.write(`data: ${line}\n\n`);
            }
            
            if (payload.event === 'click') sessionClicks++;
            if (payload.event === 'move') {
               const dist = Math.sqrt(payload.x * payload.x + payload.y * payload.y);
               sessionDistance += dist;
            }

            if (Date.now() - lastSaveTime > 10000) {
              saveStatsToDb();
              lastSaveTime = Date.now();
            }
          } catch (e) {
            // Ignore non-JSON output
          }
        }
      }
    });
    
    pythonProcess.stderr.on('data', (data: Buffer) => {
      console.warn('[Sniffer STDERR]', data.toString());
    });
    
    pythonProcess.on('close', () => {
      saveStatsToDb();
      if (!response.destroyed) {
        response.end();
      }
    });
    
    request.raw.on('close', () => {
      console.log(`[IoT] Conexión SSE cerrada. Deteniendo sniffer para handle ${handle}`);
      pythonProcess.kill();
    });
  });

  // ── GET /devices/:id/security-scan ───────────────────────────
  // Fuerza un re-escaneo de seguridad para un dispositivo específico.
  fastify.get<{ Params: { id: string } }>('/:id/security-scan', async (request, reply) => {
    const { id } = request.params;
    const device = await Device.findById(id);

    if (!device) return reply.status(404).send({ error: 'Dispositivo no encontrado.' });

    const result = await performSecurityScan(device);
    if (result.error) return reply.status(500).send(result);
    
    return result;
  });
}
