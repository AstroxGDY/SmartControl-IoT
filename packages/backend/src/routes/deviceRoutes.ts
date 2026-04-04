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
    const devices = await Device.find()
      .select('name type connectionType image owner attributes createdAt updatedAt')
      .lean();

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
  fastify.get<{ Params: GetDeviceParams; Reply: IDeviceState | { error: string } }>(
    '/:id/state',
    async (request, reply) => {
      const { id } = request.params;

      // 1. Buscamos el dispositivo en Mongo para saber de qué TIPO es
      const device = await Device.findById(id).lean();

      if (!device) {
        return reply.status(404).send({ error: 'Dispositivo no encontrado en la base de datos' });
      }

      console.log(`[IoT] Procesando telemetría para [${device.name}] (Tipo: ${device.type})`);

      // 2. OBTENER DATOS CRUDOS (Simulamos la llamada a la API de Tuya o MQTT)
      // En el futuro, aquí harás: const rawTuyaData = await tuyaApi.getDeviceStatus(device.tuyaId);
      let rawTuyaData: Record<string, any> = {};

      if (device.type === 'smart-bulb') {
        // Datos crudos simulados sacados de tus DPs
        rawTuyaData = {
          "20": true,
          "21": "colour",
          "22": 1000,
          "23": 500,
          "24": "{\"h\":275,\"s\":800,\"v\":1000}",
          "26": 0
        };
      }

      // 3. MAPEAR LOS DATOS DE FORMA GENÉRICA
      const cleanState: IDeviceState = mapGenericTuya(rawTuyaData);

      // Simular latencia de red
      await new Promise(resolve => setTimeout(resolve, 800));

      // 4. Devolvemos el JSON precioso y tipado a React
      return cleanState;
    }
  );
}