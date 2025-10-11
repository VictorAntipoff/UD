import { prisma } from '../lib/prisma.js';
export default async function healthRoutes(fastify) {
    fastify.get('/health', async (request, reply) => {
        try {
            // Test database connection
            await prisma.$queryRaw `SELECT 1`;
            // Format uptime
            const uptime = process.uptime();
            const formatted = [
                Math.floor(uptime / 86400) + 'd',
                Math.floor((uptime % 86400) / 3600) + 'h',
                Math.floor((uptime % 3600) / 60) + 'm',
                Math.floor(uptime % 60) + 's'
            ].filter(str => !str.startsWith('0')).join(' ') || '0s';
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: formatted,
                database: 'connected'
            };
        }
        catch (error) {
            console.error('Health check failed:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error occurred';
            return reply.status(500).send({
                status: 'error',
                message: 'Health check failed',
                error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
            });
        }
    });
}
