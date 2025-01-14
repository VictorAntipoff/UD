Write-Host "`nStarting Supabase setup..."

try {
    # Kill existing processes
    Write-Host "`nCleaning up processes..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2

    # Clean up old files
    Write-Host "`nRemoving old files..."
    Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force node_modules\@prisma -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Remove-Item package-lock.json -ErrorAction SilentlyContinue

    # Install dependencies
    Write-Host "`nInstalling dependencies..."
    npm install

    # Initialize database
    Write-Host "`nInitializing database..."
    npx ts-node scripts/init-db.ts

    # Create admin user
    Write-Host "`nCreating admin user..."
    npx ts-node scripts/create-admin.ts

    # Start server
    Write-Host "`nStarting server..."
    Write-Host "Login credentials:"
    Write-Host "Username: admin"
    Write-Host "Password: admin123"
    Write-Host "`nServer starting at http://localhost:3020`n"
    
    npm run dev

} catch {
    Write-Host "`nSetup failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
} 