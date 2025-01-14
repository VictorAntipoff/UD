Write-Host "`nCleaning up project..." -ForegroundColor Cyan

# Kill any running Node processes
Write-Host "Stopping Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clean backend
Write-Host "`nCleaning backend..." -ForegroundColor Green
if (Test-Path backend/node_modules) {
    Remove-Item -Recurse -Force backend/node_modules
}
if (Test-Path backend/dist) {
    Remove-Item -Recurse -Force backend/dist
}
if (Test-Path backend/.env) {
    Remove-Item -Force backend/.env
}
if (Test-Path backend/.env.staging) {
    Remove-Item -Force backend/.env.staging
}

# Clean frontend
Write-Host "`nCleaning frontend..." -ForegroundColor Green
if (Test-Path frontend/node_modules) {
    Remove-Item -Recurse -Force frontend/node_modules
}
if (Test-Path frontend/dist) {
    Remove-Item -Recurse -Force frontend/dist
}
if (Test-Path frontend/.env) {
    Remove-Item -Force frontend/.env
}
if (Test-Path frontend/.env.staging) {
    Remove-Item -Force frontend/.env.staging
}
if (Test-Path frontend/.env.production) {
    Remove-Item -Force frontend/.env.production
}

Write-Host "`nCleanup complete!" -ForegroundColor Green 