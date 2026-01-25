import type { FastifyInstance } from 'fastify';

export default async function indexRoutes(fastify: FastifyInstance) {
    // Equivale a: router.post('/register', ...)
    fastify.post('/register', async (request, reply) => {
        // Tu lógica de registro aquí
        return {
            status: 'usuario creado'
        };
    });

    // Equivale a: router.post('/login', ...)
    fastify.post('/login', async (request, reply) => {
        // Tu lógica de login aquí
        return {
            token: 'abc-123'
        };
    });
}