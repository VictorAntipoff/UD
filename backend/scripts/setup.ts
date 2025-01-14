import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

async function setup() {
  try {
    console.log('🚀 Starting setup...');

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

    // Create prisma directory if it doesn't exist
    if (!existsSync('backend/prisma')) {
      console.log('📁 Creating prisma directory...');
      execSync('mkdir backend/prisma', { stdio: 'inherit' });
    }

    console.log('📝 Writing new package.json...');
    writeFileSync('backend/package.json', JSON.stringify(packageJson, null, 2));

    // Update seed.ts
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

main();
`;

    console.log('📝 Writing new seed.ts...');
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

    console.log('🚀 Pushing schema...');
    execSync('cd backend && npx prisma db push --force-reset --accept-data-loss', { stdio: 'inherit' });

    console.log('🌱 Seeding database...');
    execSync('cd backend && npx prisma db seed', { stdio: 'inherit' });

    console.log('✅ Setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setup(); 