import type { FastifyInstance } from 'fastify';
import { DeviceStats } from '../models/DeviceStats.js';
import { Device } from '../models/Device.js';

export default async function statsRoutes(fastify: FastifyInstance) {
  
  // ── GET /stats/global ────────────────────────────────────────
  // Agrega las estadísticas de todos los dispositivos
  fastify.get('/global', async (_request, reply) => {
    try {
      const devices = await Device.find().lean();
      
      const stats = await DeviceStats.aggregate([
        {
          $group: {
            _id: '$deviceId',
            latestBattery: { $last: '$batteryLevel' },
            avgBattery: { $avg: '$batteryLevel' },
            latestStatus: { $last: '$status' },
            totalRecords: { $sum: 1 },
          }
        }
      ]);

      const result = devices.map(d => {
        const dStats = stats.find(s => s._id.toString() === d._id.toString());
        return {
          device: {
            _id: d._id,
            name: d.name,
            type: d.type,
            image: d.image,
            connectionType: d.connectionType
          },
          stats: dStats || { totalRecords: 0, latestStatus: 'offline' }
        };
      });

      return { success: true, data: result };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // ── GET /stats/:id ───────────────────────────────────────────
  // Histórico de un dispositivo específico
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Obtener los últimos 100 registros cronológicamente
      const history = await DeviceStats.find({ deviceId: id })
        .sort({ timestamp: 1 })
        .limit(100)
        .lean();

      return { success: true, data: history };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
