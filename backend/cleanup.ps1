# Kill any running Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Remove all generated/cache files
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force prisma\migrations -ErrorAction SilentlyContinue
Remove-Item -Force prisma\*.db -ErrorAction SilentlyContinue

# Fresh install
npm install

# Generate Prisma client
npx prisma generate

# Push schema
npx prisma db push --force-reset --accept-data-loss

# Run seed
npx prisma db seed 