import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import devicesRoutes from './routes/deviceRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';

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

    // Iniciar tareas en segundo plano
    const { startScheduler } = await import('./utils/scheduler.js');
    startScheduler();

    // 3. Configuración del Server
    await server.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Length'],
      credentials: false,
      preflight: true,
    });

    // 4. Plugins para archivos
    await server.register(multipart, {
      limits: {
        fieldNameSize: 100, // Max field name size in bytes
        fieldSize: 100,     // Max field value size in bytes
        fields: 10,         // Max number of non-file fields
        fileSize: 2 * 1024 * 1024, // 2MB limit
        files: 1,           // Max number of file fields
        headerPairs: 2000   // Max number of header key=>value pairs
      }
    });

    await server.register(fastifyStatic, {
      root: path.join(process.cwd(), 'uploads'),
      prefix: '/uploads/', // URL prefix: http://localhost:3000/uploads/file.png
    });
    console.log(`📂 Carpeta de subidas configurada en: ${path.join(process.cwd(), 'uploads')}`);

    await server.register(devicesRoutes, { prefix: '/devices' });
    await server.register(statsRoutes, { prefix: '/stats' });
    await server.register(ruleRoutes, { prefix: '/rules' });

    // Escuchamos en 0.0.0.0 para evitar problemas de resolución de localhost (IPv4 vs IPv6) en fetch
    await server.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`🚀 Server corriendo en puerto ${PORT}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();