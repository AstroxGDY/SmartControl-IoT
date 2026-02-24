// packages/backend/src/routes/deviceRoutes.ts
import type { FastifyInstance } from 'fastify';
import { Device } from '../models/Device.js'; 
import { type IDeviceInfo, type IDeviceState } from '../../../shared/types.js';
import {type TuyaStatus, mapSmartBulb} from '../utils/deviceMappers.js';

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
        isOn: true,
        image: "https://placehold.co/100x100/orange/white?text=Bulb",
        attributes: { brightness: 80, color: "#FFA500" } 
      },
      {
        name: "Sensor Jardín",
        type: "sensor",
        connectionType: "Zigbee",
        status: "online",
        isOn: true,
        image: "https://placehold.co/100x100/green/white?text=Sensor",
        attributes: { temperature: 24, humidity: 60, battery: 90 }
      },
      {
        name: "Cámara Puerta",
        type: "camera",
        connectionType: "WiFi",
        status: "offline",
        isOn: false,
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
      .select('name type connectionType image owner createdAt updatedAt')
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

      // 3. MAPEAR LOS DATOS SEGÚN EL TIPO
      let cleanState: IDeviceState;

      switch (device.type) {
        case 'smart-bulb':
          cleanState = mapSmartBulb(rawTuyaData);
          break;
        default:
          // Mapper por defecto si no tenemos uno específico
          cleanState = {
            status: 'online',
            isOn: false,
            attributes: { info: "Dispositivo no soportado o mapeado aún" }
          };
      }

      // Simular latencia de red
      await new Promise(resolve => setTimeout(resolve, 800));

      // 4. Devolvemos el JSON precioso y tipado a React
      return cleanState;
    }
  );
}