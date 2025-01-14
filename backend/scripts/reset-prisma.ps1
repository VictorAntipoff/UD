Write-Host "Cleaning up processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Removing old files..."
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

Write-Host "Installing dependencies..."
npm install

Write-Host "Generating Prisma client..."
npx prisma generate

Write-Host "Pushing schema..."
npx prisma db push --force-reset --accept-data-loss

Write-Host "Creating admin user..."
npx ts-node scripts/create-admin.ts

Write-Host "Starting server..."
npm run dev 