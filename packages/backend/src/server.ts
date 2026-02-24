import 'dotenv/config'; // <--- Carga las variables del .env
import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import devicesRoutes from './routes/deviceRoutes.js';
import { seedDatabase } from './utils/seed.js'; // <--- Importamos el seed

const server = Fastify({ logger: true });
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test';

const start = async () => {
  try {
    // 1. Conectar a BDD
    await mongoose.connect(MONGO_URI);
    console.log('🍃 Conectado a MongoDB');

    // 2. Ejecutar Seed Automático (Solo si está vacía)
    await seedDatabase();

    // 3. Configuración del Server
    await server.register(cors, { origin: true });
    await server.register(devicesRoutes, {prefix: '/devices'});

    await server.listen({ port: Number(PORT) });
    console.log(`🚀 Server corriendo en puerto ${PORT}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();