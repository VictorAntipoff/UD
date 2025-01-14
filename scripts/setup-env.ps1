Write-Host "`nSetting up environment files..." -ForegroundColor Cyan

try {
    # Backend environment
    if (!(Test-Path backend/.env)) {
        Copy-Item backend/.env.example backend/.env
        Write-Host "Created backend/.env from example" -ForegroundColor Green
    }

    # Frontend environment
    if (!(Test-Path frontend/.env)) {
        Copy-Item frontend/.env.example frontend/.env
        Write-Host "Created frontend/.env from example" -ForegroundColor Green
    }

    Write-Host "`nEnvironment files created successfully!" -ForegroundColor Green
    Write-Host "Please update the values in .env files with your actual credentials`n" -ForegroundColor Yellow

} catch {
    Write-Host "`nSetup failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} 