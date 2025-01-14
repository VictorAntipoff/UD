import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initializing database...');
    console.log('Using database URL:', process.env.DATABASE_URL);

    // Drop and recreate schema
    console.log('\nResetting schema...');
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO postgres;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);

    // Create Role enum type
    console.log('\nCreating Role enum type...');
    await prisma.$executeRawUnsafe(`
      CREATE TYPE public."Role" AS ENUM ('USER', 'ADMIN');
    `);

    // Create users table manually
    console.log('\nCreating users table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE public.users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        role "Role" NOT NULL DEFAULT 'USER',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Grant permissions
    await prisma.$executeRawUnsafe(`GRANT ALL ON TABLE public.users TO postgres;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON TABLE public.users TO public;`);

    // Create additional tables
    console.log('\nCreating project tables...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE public.projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "ownerId" TEXT NOT NULL REFERENCES users(id),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE public.designs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content JSONB NOT NULL,
        thumbnail TEXT,
        "projectId" TEXT NOT NULL REFERENCES projects(id),
        "creatorId" TEXT NOT NULL REFERENCES users(id),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE public.comments (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        "designId" TEXT NOT NULL REFERENCES designs(id),
        "authorId" TEXT NOT NULL REFERENCES users(id),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Grant permissions
    await prisma.$executeRawUnsafe(`
      GRANT ALL ON TABLE public.projects TO postgres;
      GRANT ALL ON TABLE public.designs TO postgres;
      GRANT ALL ON TABLE public.comments TO postgres;
    `);

    // Verify tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('\nCreated tables:', tables);

    console.log('\nDatabase initialization complete!');

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 