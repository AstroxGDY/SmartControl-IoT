import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import devicesRoutes from './routes/deviceRoutes.js';

const server = Fastify({ logger: true });
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test';

const start = async () => {
  try {
    // Conectar a MongoDB en background para no bloquear el arranque del servidor
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
      .then(async () => {
        console.log('🍃 Conectado a MongoDB');
      })
      .catch((err) => {
        console.warn('⚠️ No se ha podido conectar a MongoDB. La API arrancará igual, pero sin DB.');
      });

    // 3. Configuración del Server
    await server.register(cors, {
      origin: true,  // refleja el Origin de la request (válido para Electron y localhost)
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Length'],
      credentials: false,
      preflight: true,   // responde automáticamente a OPTIONS con 204
    });

    await server.register(devicesRoutes, { prefix: '/devices' });

    // Escuchamos en 0.0.0.0 para evitar problemas de resolución de localhost (IPv4 vs IPv6) en fetch
    await server.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`🚀 Server corriendo en puerto ${PORT}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();