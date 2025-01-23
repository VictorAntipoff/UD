import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function factoryRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    // Your factory list logic here
  });

  fastify.post('/', async (request, reply) => {
    // Your factory creation logic here
  });
}

export default factoryRoutes; 