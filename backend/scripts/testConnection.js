const { Client } = require('pg');

async function testConnection() {
  // Direct connection string, no env file needed
  const client = new Client({
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.uwnmeakvlomarvclkmow',
    password: 'Vinatati@010',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Testing connection...');
    await client.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connection successful!');
    console.log('Server time:', result.rows[0].now);
    await client.end();

    // If connection works, write the schema
    const { writeFileSync } = require('fs');
    const { mkdirSync } = require('fs');

    // Ensure prisma directory exists
    mkdirSync('prisma', { recursive: true });
    
    // Write schema.prisma with correct connection URL
    const schema = `generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://postgres.uwnmeakvlomarvclkmow:Vinatati@010@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
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

    console.log('\n📝 Writing schema.prisma...');
    writeFileSync('prisma/schema.prisma', schema);
    console.log('✅ Schema written successfully!');

    console.log('\n🚀 Running Prisma commands...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma db push --force-reset --accept-data-loss', { stdio: 'inherit' });
    
    console.log('\n✨ All done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();