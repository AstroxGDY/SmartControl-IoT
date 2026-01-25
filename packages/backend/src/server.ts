import Fastify, { fastify } from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';

const server = Fastify({ logger: true });

// 1. Configurar CORS para que Electron pueda hablar con el Back
await server.register(cors, { 
  origin: "http://localhost:5173"
});

// 2. Conexión a MongoDB (Asegúrate de tener MongoDB instalado y corriendo)
mongoose.connect('mongodb://127.0.0.1:27017/smartcontrol')
  .then(() => console.log('🍃 Conectado a MongoDB'))
  .catch(err => console.error('❌ Error en Mongo:', err));

// 3. Tu primera ruta real
server.get('/hola', async () => {
  return { msg: "¡Conexión establecida y Base de Datos lista! ✅" };
});

// Rutas
import indexRoutes from './routes/index.js';

server.register(indexRoutes, {prefix:'/'});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();