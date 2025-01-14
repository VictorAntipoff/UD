Write-Host "`nStarting setup process..."

# Kill any running Node processes
Write-Host "`nCleaning up processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Generate Prisma client
Write-Host "`nGenerating Prisma client..."
npx prisma generate

# Push schema to database
Write-Host "`nPushing schema to database..."
npx prisma db push --force-reset --accept-data-loss

# Create admin user
Write-Host "`nCreating admin user..."
npx ts-node scripts/verify-admin.ts

# Start the server in background
Write-Host "`nStarting server..."
$serverJob = Start-Job -ScriptBlock {
    Set-Location C:\UDAPP\backend
    npm run dev
}

# Wait for server to start
Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 5

# Run API tests
Write-Host "`nRunning API tests..."
.\scripts\test-api.ps1

# Cleanup
Write-Host "`nCleaning up..."
Stop-Job $serverJob
Remove-Job $serverJob

Write-Host "`nSetup complete!" 