import type { FastifyInstance } from 'fastify';
import { Device } from '../models/Device.js';
import { type IDeviceInfo, type IDeviceState } from '../../../shared/types.js';
import { type TuyaStatus, mapGenericTuya } from '../utils/deviceMappers.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execAsync = promisify(exec);


// UNA ÚNICA EXPORTACIÓN PARA TODAS LAS RUTAS DE DEVICES
export default async function deviceRoutes(fastify: FastifyInstance) {

  // ==========================================================
  // 1. SEED: Mock de datos iniciales
  // POST /devices/seed -> Llenará la base de datos para pruebas
  // ==========================================================
  fastify.post('/seed', async (request, reply) => {
    await Device.deleteMany({}); // Limpia la colección primero

    const mockData = [
      {
        name: "Luz Salón",
        type: "smart-bulb",
        connectionType: "WiFi",
        status: "online",
        attributes: { brightness: 80, color: "#FFA500" }
      },
      {
        name: "Sensor Jardín",
        type: "sensor",
        connectionType: "Zigbee",
        status: "online",
        image: "https://placehold.co/100x100/green/white?text=Sensor",
        attributes: { temperature: 24, humidity: 60, battery: 90 }
      },
      {
        name: "Cámara Puerta",
        type: "camera",
        connectionType: "WiFi",
        status: "offline",
        image: "https://placehold.co/100x100/black/white?text=Cam",
        attributes: { resolution: "1080p", recordingMode: "motion-detect" }
      }
    ];

    const created = await Device.insertMany(mockData);
    return { status: 'Base de datos poblada', count: created.length };
  });

  // ==========================================================
  // 2. GET: Obtener todos (Info Estática para las Cards)
  // GET /devices/
  // ==========================================================
  fastify.get<{ Reply: IDeviceInfo[] }>('/', async (request, reply) => {
    let devices = (await Device.find()
      .select('name type connectionType status image owner attributes createdAt updatedAt')
      .lean()) as any[];

    // =============== LIVE LOCAL POLLING =================
    const queryData = devices.map(d => ({
        _id: d._id.toString(),
        tuyaId: d.attributes?.tuyaId,
        ip: d.attributes?.ip,
        localKey: d.attributes?.localKey,
        version: d.attributes?.version || '3.3'
    })).filter(d => d.tuyaId && d.ip && d.localKey);

    if (queryData.length > 0) {
        try {
            console.log(`[IoT] Consultando estado en vivo de ${queryData.length} dispositivos para la vista principal...`);
            const tempFile = path.resolve(process.cwd(), `temp_query_${Date.now()}.json`);
            await fs.writeFile(tempFile, JSON.stringify(queryData), 'utf-8');
            
            const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'get_statuses.py');
            const { stdout } = await execAsync(`python "${scriptPath}" "${tempFile}"`, { env: process.env });
            
            await fs.unlink(tempFile).catch(() => {}); // Limpiar
            
            const firstBrace = stdout.indexOf('{');
            const lastBrace = stdout.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                const result = JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
                if (result.success && result.results) {
                    // Actualizar en memoria y persistir en la DB en background
                    for (const live of result.results) {
                        const idx = devices.findIndex(d => d._id.toString() === live._id);
                        if (idx !== -1) {
                            if (live.success && live.dps) {
                                devices[idx].status = 'online';
                                devices[idx].attributes = { ...devices[idx].attributes, dps: live.dps };
                                Device.updateOne(
                                    { _id: devices[idx]._id },
                                    { $set: { status: 'online', 'attributes.dps': live.dps } }
                                ).exec().catch(() => {});
                            } else {
                                devices[idx].status = 'offline';
                                Device.updateOne({ _id: devices[idx]._id }, { $set: { status: 'offline' } }).exec().catch(() => {});
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[IoT] Fallo al consultar múltiples estados en paralelo:', e);
            // Ignoramos y borramos archivo si quedó tirado
            const tempMatches = await fs.readdir(process.cwd());
            tempMatches.filter(f => f.startsWith('temp_query_')).forEach(f => fs.unlink(path.resolve(process.cwd(), f)).catch(()=>{}));
        }
    }
    // ====================================================

    const formattedDevices: IDeviceInfo[] = devices.map(device => ({
      ...device,
      _id: device._id.toString(),
    }));

    return formattedDevices;
  });

  // ==========================================================
  // 3. POST: Crear uno nuevo (Guardar en BBDD)
  // POST /devices/
  // ==========================================================
  fastify.post<{ Body: IDeviceInfo; Reply: IDeviceInfo }>('/', async (request, reply) => {
    const { name, type, connectionType, image, owner } = request.body;

    const newDevice = new Device({
      name,
      type,
      connectionType,
      image,
      owner
    });

    const savedDevice = await newDevice.save();
    const deviceObject = savedDevice.toObject();

    return {
      ...deviceObject,
      _id: deviceObject._id.toString()
    };
  });

  // ==========================================================
  // 3.5. POST: Escanear nuevos dispositivos en la red
  // POST /devices/scan
  // ==========================================================
  fastify.post('/scan', async (request, reply) => {
    console.log('[IoT] Iniciando escaneo de dispositivos nativo con Python (tinytuya) debido a encriptación...');

    try {
      // Usamos tinytuya, la única forma fácil y robusta de romper la encriptación UDP v3.4 sin tener el ID/KEY previo.
      const snapshotPath = path.resolve(process.cwd(), 'snapshot.json');

      console.log(`[IoT DEBUG] Ejecutando: python -m tinytuya scan -nocolor -y -snapshot-file "${snapshotPath}"`);
      await execAsync(`python -m tinytuya scan -nocolor -y -snapshot-file "${snapshotPath}"`);

      // Extraer datos descifrados de forma segura del snapshot
      let scanData = { devices: [] };
      try {
        const fileContent = await fs.readFile(snapshotPath, 'utf8');
        scanData = JSON.parse(fileContent);
      } catch (err) {
        console.warn('[IoT DEBUG] No se pudo leer snapshot.json. Seguramente la red no devuelva nada válido.');
      }

      // Limpiamos la basura generada
      try {
        await fs.unlink(snapshotPath);
      } catch (e) {
        // Nada
      }

      // ===================================
      // FETCH NUBE: Obtener nombres y dps
      // ===================================
      let cloudDevices: any[] = [];
      try {
        const cloudScript = path.resolve(process.cwd(), 'src', 'scripts', 'cloud_scan.py');
        const { stdout: cloudOut } = await execAsync(`python "${cloudScript}"`, { env: process.env });
        const cJsonMatch = cloudOut.match(/\[[\s\S]*\]/);
        if (cJsonMatch) {
          cloudDevices = JSON.parse(cJsonMatch[0]);
        }
      } catch (e) {
        console.warn('[IoT DEBUG] No se pudo obtener la nube para hacer cross-match', e);
      }

      // ===================================
      // MERGE LOCAL + CLOUD
      // ===================================
      const foundDevices = scanData.devices.map((d: any, idx: number) => {
        // Buscar el id en la nube
        const cMatch = cloudDevices.find((c: any) => c.id === d.id);

        return {
          name: cMatch?.name || d.name || `Dispositivo Inteligente ${d.id.substring(d.id.length - 4).toUpperCase()}`,
          type: cMatch?.category || d.dev_type || (d.productKey ? 'smart-device' : 'unknown'),
          connectionType: 'WiFi',
          status: 'online',
          image: cMatch?.icon || `https://placehold.co/100x100/cyan/white?text=Nuevo+${idx + 1}`,
          params: {
            tuyaId: d.id,
            ip: d.ip,
            productKey: d.productKey,
            version: d.ver || d.version,
            localKey: cMatch?.local_key, // Si ya lo pilla aquí nos ahorramos el /pair
            dps: cMatch?.dps
          }
        };
      });

      console.log(`[IoT] Escaneo finalizado. Encontrados ${foundDevices.length} dispositivos mediante desencriptación.`);
      return { message: 'Escaneo finalizado', devices: foundDevices };

    } catch (error: any) {
      console.error('[IoT ERROR] Error ejecutando python tinytuya:', error.message);
      return reply.status(500).send({ error: 'Fallo fatal en script desencriptador de red local.' });
    }
  });

  // ==========================================================
  // 3.6. POST: Emparejar Dispositivo (Obtener LocalKey de la Nube)
  // POST /devices/pair
  // ==========================================================
  fastify.post('/pair', async (request, reply) => {
    const { deviceData } = request.body as any;

    if (!deviceData || !deviceData.params || !deviceData.params.tuyaId) {
      return reply.status(400).send({ error: 'Datos de dispositivo inválidos. Falta tuyaId.' });
    }

    const { tuyaId, ip, version, productKey } = deviceData.params;
    console.log(`[IoT Cloud] Intentando emparejar dispositivo [${deviceData.name}] (TuyaID: ${tuyaId})...`);

    const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'cloud_pair.py');

    try {
      // Inyectamos las variables locales hacia python de forma segura en el proceso
      const envObj = {
        ...process.env,
        TUYA_DEVICE_ID: tuyaId
      };

      const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, { env: envObj });

      // Cortamos exactamente desde la primera llave `{` hasta la última llave `}` para aislar el JSON puro de saltos de línea (\r\n) u otros prints.
      const firstBrace = stdout.indexOf('{');
      const lastBrace = stdout.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1) {
        console.error('[IoT ERROR] Salida de Python incomprensible:', stdout, stderr);
        return reply.status(500).send({ error: `Fallo sin JSON: ${stdout.substring(0, 50)}...` });
      }

      const jsonStr = stdout.substring(firstBrace, lastBrace + 1);
      const result = JSON.parse(jsonStr);

      if (result.error) {
        return reply.status(500).send({ error: result.error });
      }

      const localKey = result.local_key;
      console.log(`[IoT Cloud] ¡LocalKey obtenida con código de encriptación! Guardando en la BBDD...`);

      // Ahora que tenemos la clave local, podemos guardar el dispositivo real en MongoDB
      const newDevice = new Device({
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
          dps: deviceData.params.dps || {}
        }
      });

      const savedDevice = await newDevice.save();

      return {
        message: '¡Emparejado con éxito!',
        device: savedDevice
      };

    } catch (error: any) {
      console.error('[IoT ERROR] Excepción al emparejar con la nube de Tuya:', error.message);
      // Extraemos el error stdout si existe (cuando python hace crash total)
      const details = error.stdout ? error.stdout.toString() : error.message;
      return reply.status(500).send({ error: `Error del sistema: ${details.substring(0, 100)}` });
    }
  });

  interface GetDeviceParams {
    id: string;
  }

  // ==========================================================
  // 4. GET: Obtener información concreta/dinámica (Mapeada)
  // GET /devices/:id/state
  // ==========================================================
  fastify.get<{ Params: GetDeviceParams; Reply: any }>(
    '/:id/state',
    async (request, reply) => {
      const { id } = request.params;

      const device = await Device.findById(id).lean();

      if (!device) {
        return reply.status(404).send({ error: 'Dispositivo no encontrado en la base de datos' });
      }

      if (!device.attributes || !device.attributes.ip || !device.attributes.localKey || !device.attributes.tuyaId) {
        return reply.status(400).send({ error: 'Faltan credenciales locales para consultar estado' });
      }

      console.log(`[IoT] Solicitando STATUS real para [${device.name}] (Tipo: ${device.type})`);

      // 1. GESTIÓN DEL DICCIONARIO (SCHEMA)
      let schema = device.attributes.schema;
      if (!schema && process.env.TUYA_API_REGION) {
        console.log(`[IoT] Descargando DB de Diccionario (Schema) faltante de [${device.name}]...`);
        const schemaPath = path.resolve(process.cwd(), 'src', 'scripts', 'get_schema.py');
        const schemaEnv = {
          ...process.env,
          TUYA_DEVICE_ID: device.attributes.tuyaId
        };
        try {
          const { stdout } = await execAsync(`python "${schemaPath}"`, { env: schemaEnv });
          const fb = stdout.indexOf('{');
          const lb = stdout.lastIndexOf('}');
          if (fb !== -1 && lb !== -1) {
            const schRes = JSON.parse(stdout.substring(fb, lb + 1));
            if (schRes.success && schRes.schema) {
              schema = schRes.schema;
              // Guardar en la bbdd permanentemente en background
              await Device.updateOne({ _id: id }, { $set: { 'attributes.schema': schema } });
            }
          }
        } catch(e) {
          console.warn('[IoT] No se pudo obtener el schema dinámico', e);
        }
      }

      // 2. GESTIÓN DE DPS
      const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'get_status.py');
      const envObj = {
        ...process.env,
        TUYA_DEVICE_ID: device.attributes.tuyaId,
        TUYA_IP: device.attributes.ip,
        TUYA_LOCAL_KEY: device.attributes.localKey,
        TUYA_VERSION: device.attributes.version || '3.3'
      };

      try {
        const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, { env: envObj });
        
        const firstBrace = stdout.indexOf('{');
        const lastBrace = stdout.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('Sin salida JSON de Python');
        }

        const result = JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
        
        if (result.error) {
          // Si el dispositivo está apagado físicamente, Tuya da "Network Error" usualmente u otro error.
          return reply.status(503).send({ error: result.error, offline: true });
        }
        
        // Devolvemos exitosamente los DPS reales junto al diccionario semántico
        return { success: true, dps: result.data.dps || {}, schema: schema || [] };

      } catch (error: any) {
        console.error('[IoT ERROR] Error consultando status:', error.message);
        return reply.status(503).send({ error: 'Error de red con el dispositivo', offline: true });
      }
    }
  );

  // ==========================================================
  // 5. POST: Enviar Comando (Encender/Apagar)
  // POST /devices/:id/command
  // ==========================================================
  fastify.post<{ Params: GetDeviceParams; Body: { dp: string; value: any }; Reply: any }>(
    '/:id/command',
    async (request, reply) => {
      const { id } = request.params;
      const { dp, value } = request.body;

      const device = await Device.findById(id).lean();
      if (!device) {
        return reply.status(404).send({ error: 'Dispositivo no encontrado' });
      }

      if (!device.attributes || !device.attributes.ip || !device.attributes.localKey || !device.attributes.tuyaId) {
        return reply.status(400).send({ error: 'Faltan credenciales locales para enviar comando' });
      }

      const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'send_command.py');
      const envObj = {
        ...process.env,
        TUYA_DEVICE_ID: device.attributes.tuyaId,
        TUYA_IP: device.attributes.ip,
        TUYA_LOCAL_KEY: device.attributes.localKey,
        TUYA_VERSION: device.attributes.version || '3.3',
        TUYA_DP: dp,
        TUYA_VALUE: String(value)
      };

      try {
        const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, { env: envObj });

        const firstBrace = stdout.indexOf('{');
        const lastBrace = stdout.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('Sin salida JSON de Python');
        }

        const result = JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
        if (result.error) return reply.status(500).send(result);

        return { success: true, ...result };
      } catch (error: any) {
        console.error('[IoT ERROR] Error enviando comando:', error.message);
        return reply.status(500).send({ error: 'Error enviando comando a dispositivo' });
      }
    }
  );
}