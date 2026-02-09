// packages/backend/src/routes/deviceRoutes.ts
import type { FastifyInstance } from 'fastify';
import { Device } from '../models/Device.js'; 
import { type IDevice } from '../../../shared/types.js'; // Para tipar respuestas

export default async function deviceRoutes(fastify: FastifyInstance) {

  // GET: Obtener todos
  fastify.get<{ Reply: IDevice[] }>('/devices', async (request, reply) => {
    // TypeScript sabe que 'devices' es un array de documentos
    const devices = await Device.find();
    
    // Fastify/Mongoose convierten automáticamente el _id (ObjectId) a string al enviar el JSON
    return devices;
  });

  // POST: Crear uno
  fastify.post<{ Body: IDevice }>('/devices', async (request, reply) => {
    // TypeScript te avisará si intentas acceder a request.body.algoQueNoExiste
    const { name, type, connectionType } = request.body;

    const newDevice = new Device({
      name,
      type,
      connectionType,
      // ... resto de campos
    });

    await newDevice.save();
    return newDevice;
  });
}