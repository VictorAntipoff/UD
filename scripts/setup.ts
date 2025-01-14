const { execSync } = require('child_process');
const { writeFileSync, unlinkSync, rmSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

async function setup() {
  try {
    console.log('🚀 Starting setup...');

    // Create .env file with updated connection strings
    const envContent = `PORT=3020
# Main connection URL with pgBouncer
DATABASE_URL="postgresql://postgres.uwnmeakvlomarvclkmow:Vinatati010@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
# Direct connection URL for migrations/schema changes
DIRECT_URL="postgresql://postgres.uwnmeakvlomarvclkmow:Vinatati010@db.uwnmeakvlomarvclkmow.supabase.co:5432/postgres?connection_limit=1"
JWT_SECRET="VWCDGY71SSTHe3BKZPRcd5cSr8JiVm/PFiJUjvYqsCVGfAqY5oqbQBpSbFdPpBXsE0qJfYS8WvMIh/upzhnLkg=="
FRONTEND_URL="http://localhost:3010"
NODE_ENV="development"`;

    console.log('📝 Writing .env...');
    writeFileSync('backend/.env', envContent);

    // Create .env.production with same connection strings
    const envProdContent = `PORT=3020
DATABASE_URL="postgresql://postgres.uwnmeakvlomarvclkmow:Vinatati010@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.uwnmeakvlomarvclkmow:Vinatati010@db.uwnmeakvlomarvclkmow.supabase.co:5432/postgres?connection_limit=1"
JWT_SECRET="VWCDGY71SSTHe3BKZPRcd5cSr8JiVm/PFiJUjvYqsCVGfAqY5oqbQBpSbFdPpBXsE0qJfYS8WvMIh/upzhnLkg=="
FRONTEND_URL="https://your-production-frontend-url.com"
NODE_ENV="production"`;

    console.log('📝 Writing .env.production...');
    writeFileSync('backend/.env.production', envProdContent);

    // Create vercel.json
    const vercelConfig = {
      "version": 2,
      "builds": [
        {
          "src": "dist/server.js",
          "use": "@vercel/node"
        }
      ],
      "routes": [
        {
          "src": "/(.*)",
          "dest": "dist/server.js"
        }
      ]
    };

    console.log('📝 Writing vercel.json...');
    writeFileSync('backend/vercel.json', JSON.stringify(vercelConfig, null, 2));

    // Create necessary directories
    ['backend/prisma', 'scripts'].forEach(dir => {
      if (!existsSync(dir)) {
        console.log(`📁 Creating ${dir} directory...`);
        mkdirSync(dir, { recursive: true });
      }
    });

    // Update package.json
    const packageJson = {
      "name": "udesign-backend",
      "version": "1.0.0",
      "description": "UDesign Backend API",
      "main": "src/server.ts",
      "scripts": {
        "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
        "build": "tsc",
        "start": "node dist/server.js",
        "prisma:generate": "prisma generate",
        "prisma:push": "prisma db push",
        "prisma:seed": "prisma db seed",
        "clean": "rimraf dist node_modules",
        "test": "jest"
      },
      "prisma": {
        "seed": "ts-node prisma/seed.ts"
      },
      "dependencies": {
        "@prisma/client": "5.8.1",
        "crypto-js": "^4.2.0",
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "express": "^4.18.2",
        "jsonwebtoken": "^9.0.2"
      },
      "devDependencies": {
        "prisma": "5.8.1",
        "@types/crypto-js": "^4.2.1",
        "@types/cors": "^2.8.17",
        "@types/express": "^4.17.21",
        "@types/node": "^20.10.6",
        "typescript": "^5.3.3",
        "ts-node": "^10.9.2",
        "ts-node-dev": "^2.0.0"
      }
    };

    // Write package.json
    console.log('📝 Writing package.json...');
    writeFileSync('backend/package.json', JSON.stringify(packageJson, null, 2));

    // Write schema.prisma
    const schemaContent = `
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public"]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  firstName String
  lastName  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  woodSlicingJobs WoodSlicingJob[]

  @@map("users")
  @@schema("public")
}

model Setting {
  id          String      @id @default(cuid())
  key         String      @unique
  value       Json
  category    SettingType
  description String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("settings")
  @@schema("public")
}

model WoodSlicingJob {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  woodType  String    @map("wood_type")
  thickness Float
  quantity  Int
  status    JobStatus @default(PENDING)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id])

  @@map("wood_slicing_jobs")
  @@schema("public")
}

enum Role {
  USER
  MANAGER
  ADMIN

  @@schema("public")
}

enum SettingType {
  WOOD
  SLICING
  SYSTEM

  @@schema("public")
}

enum JobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED

  @@schema("public")
}`;

    console.log('📝 Writing schema.prisma...');
    writeFileSync('backend/prisma/schema.prisma', schemaContent);

    // Write seed.ts
    const seedContent = `
import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return \`\${buf.toString('hex')}.\${salt}\`;
}

async function main() {
  try {
    const hashedPassword = await hashPassword('admin123');
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@udesign.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true
      }
    });
    
    console.log('Admin created:', admin);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();`;

    console.log('📝 Writing seed.ts...');
    writeFileSync('backend/prisma/seed.ts', seedContent);

    console.log('🧹 Cleaning up old files...');
    if (existsSync('backend/node_modules')) {
      rmSync('backend/node_modules', { recursive: true, force: true });
    }
    if (existsSync('backend/package-lock.json')) {
      unlinkSync('backend/package-lock.json');
    }
    if (existsSync('backend/.prisma')) {
      rmSync('backend/.prisma', { recursive: true, force: true });
    }

    console.log('📦 Installing dependencies...');
    execSync('cd backend && npm install', { stdio: 'inherit' });

    console.log('🔧 Generating Prisma client...');
    execSync('cd backend && npx prisma generate', { stdio: 'inherit' });

    // Add a delay before database operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🚀 Pushing schema...');
    try {
      // First try to reset the database
      execSync('cd backend && npx prisma db push --force-reset --accept-data-loss', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DIRECT_URL // Use DIRECT_URL for schema operations
        }
      });
    } catch (error) {
      console.error('Failed to push schema:', error);
      
      // Try alternative approach
      console.log('Trying alternative approach...');
      execSync('cd backend && npx prisma migrate reset --force', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DIRECT_URL
        }
      });
    }

    // Add a longer delay before seeding
    console.log('Waiting for database changes to apply...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🌱 Seeding database...');
    try {
      execSync('cd backend && npx prisma db seed', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DIRECT_URL
        }
      });
    } catch (error) {
      console.error('Failed to seed database:', error);
      process.exit(1);
    }

    console.log('✅ Setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setup(); 