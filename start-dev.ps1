# Store the root directory
$rootDir = $PSScriptRoot

# Clear the terminal
Clear-Host

Write-Host "🚀 Starting UDesign Development Servers..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Detect OS and set the appropriate terminal command
$isWindows = $PSVersionTable.Platform -eq 'Win32NT' -or [System.Environment]::OSVersion.Platform -eq 'Win32NT'
if ($isWindows) {
    $terminalCmd = 'cmd'
    $terminalArgs = @("/k")
} else {
    # For macOS/Linux
    $terminalCmd = 'osascript'
    $terminalArgs = @(
        "-e",
        "tell application `"Terminal`"",
        "-e",
        "do script"
    )
}

# Setup backend
Write-Host "`n📡 Setting up backend..." -ForegroundColor Yellow
Set-Location "$rootDir/backend"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Generate Prisma client
Write-Host "🔨 Generating Prisma client..." -ForegroundColor Yellow
npm run prisma:generate

# Start backend in a new terminal
Write-Host "`n🚀 Starting backend server (http://localhost:3010)..." -ForegroundColor Green
if ($isWindows) {
    Start-Process $terminalCmd -ArgumentList ($terminalArgs + "cd `"$rootDir/backend`" && npm run dev")
} else {
    Start-Process $terminalCmd -ArgumentList ($terminalArgs + "`"cd `"$rootDir/backend`" && npm run dev`"" + "-e" + "end tell")
}

# Setup frontend
Write-Host "`n🌐 Setting up frontend..." -ForegroundColor Yellow
Set-Location "$rootDir/frontend"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Start frontend in a new terminal
Write-Host "`n🚀 Starting frontend server (http://localhost:3020)..." -ForegroundColor Green
if ($isWindows) {
    Start-Process $terminalCmd -ArgumentList ($terminalArgs + "cd `"$rootDir/frontend`" && npm run dev")
} else {
    Start-Process $terminalCmd -ArgumentList ($terminalArgs + "`"cd `"$rootDir/frontend`" && npm run dev`"" + "-e" + "end tell")
}

# Return to root
Set-Location $rootDir

Write-Host "`n✨ Development servers started!" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3020" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3010" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "`n📝 To stop the servers, close their terminal windows." -ForegroundColor Yellow