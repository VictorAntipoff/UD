#!/bin/bash
set -e

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations in production
if [ "$VERCEL_ENV" = "production" ]; then
  echo "Running migrations in production..."
  npx prisma migrate deploy
fi 