import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends globalThis.Global {
  prisma: PrismaClient;
}

declare const global: CustomNodeJsGlobal;

const prisma = global.prisma || 
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;

// Cleanup function
export async function disconnect() {
  await prisma.$disconnect();
}

// Handle cleanup on app termination
process.on('beforeExit', async () => {
  await disconnect();
}); 