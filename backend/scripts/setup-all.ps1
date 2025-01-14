Write-Host "`nStarting complete setup process..."

# Function to check if a command was successful
function Test-LastCommand {
    if (-not $?) {
        Write-Host "Error occurred. Stopping script."
        exit 1
    }
}

try {
    # Kill any running Node processes
    Write-Host "`nCleaning up processes..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

    # Clean up old files
    Write-Host "`nRemoving old files..."
    Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force node_modules\@prisma -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Remove-Item package-lock.json -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

    # Create necessary directories
    Write-Host "`nCreating directories..."
    New-Item -ItemType Directory -Force -Path public | Out-Null
    
    # Copy placeholder logo if it doesn't exist
    if (-not (Test-Path "public\logo.png")) {
        Copy-Item "..\frontend\public\vite.svg" -Destination "public\logo.png" -ErrorAction SilentlyContinue
    }

    # Install dependencies
    Write-Host "`nInstalling dependencies..."
    npm install
    Test-LastCommand

    # Generate Prisma client
    Write-Host "`nGenerating Prisma client..."
    npx prisma generate
    Test-LastCommand

    # Push schema to database
    Write-Host "`nPushing schema to database..."
    npx prisma db push --force-reset --accept-data-loss
    Test-LastCommand

    # Create admin user
    Write-Host "`nCreating admin user..."
    npx ts-node scripts/create-admin.ts
    Test-LastCommand

    # Build the project
    Write-Host "`nBuilding project..."
    npm run build
    Test-LastCommand

    # Start the server
    Write-Host "`nStarting server..."
    npm run dev

} catch {
    Write-Host "`nError occurred:"
    Write-Host $_.Exception.Message
    exit 1
} 