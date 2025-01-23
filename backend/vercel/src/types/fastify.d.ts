import { FastifyInstance } from 'fastify';

export interface FastifyPluginAsync {
  (fastify: FastifyInstance, opts?: Record<string, any>): Promise<void>;
} 