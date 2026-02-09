import type { FastifyInstance } from 'fastify';
import { Device } from '../models/Device.js';

export default async function deviceRoutes(fastify: FastifyInstance) {

  // 1. Obtener todos los dispositivos (Para tu dashboard)
  fastify.get('/devices', async (request, reply) => {
    try {
      const devices = await Device.find();
      return devices;
    } catch (err) {
      reply.code(500).send(err);
    }
  });

  // 2. Crear un dispositivo nuevo (Para probar manualmente)
  fastify.post('/devices', async (request, reply) => {
    try {
      const newDevice = new Device(request.body);
      await newDevice.save();
      return newDevice;
    } catch (err) {
      reply.code(400).send(err);
    }
  });

  // 3. SEED: Mock de datos iniciales
  // Ejecuta una petición POST a http://localhost:3000/seed para llenar tu BD
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
        attributes: { brightness: 80, color: "#FFA500" } // Campos únicos de luz
      },
      {
        name: "Sensor Jardín",
        type: "sensor",
        connectionType: "Zigbee",
        status: "online",
        isOn: true,
        image: "https://placehold.co/100x100/green/white?text=Sensor",
        attributes: { temperature: 24, humidity: 60, battery: 90 } // Campos únicos de sensor
      },
      {
        name: "Cámara Puerta",
        type: "camera",
        connectionType: "WiFi",
        status: "offline",
        isOn: false,
        image: "https://placehold.co/100x100/black/white?text=Cam",
        attributes: { resolution: "1080p", recordingMode: "motion-detect" } // Campos únicos de cámara
      }
    ];

    const created = await Device.insertMany(mockData);
    return { status: 'Base de datos poblada', count: created.length };
  });
}