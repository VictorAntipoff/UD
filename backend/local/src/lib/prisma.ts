import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: ['warn', 'error']
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;

  // Debug logging
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    
    console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
    return result;
  });
}

export async function disconnect() {
  await prisma.$disconnect();
}

export { prisma };
