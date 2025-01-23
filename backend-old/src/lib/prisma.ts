import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaOptions = {
  log: ['error', 'warn'],
  errorFormat: 'minimal'
};

export const prisma = global.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Initialize connection
prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch(error => console.error('Database connection failed:', error));

// Debug database connection
prisma.$on('query', (e: any) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});

export default prisma;
