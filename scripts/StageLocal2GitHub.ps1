Write-Host "`nStarting staging deployment to GitHub..." -ForegroundColor Cyan

try {
    # Run cleanup first
    Write-Host "`nRunning cleanup..." -ForegroundColor Yellow
    .\scripts\cleanup.ps1

    # Check if there are uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Host "`nUncommitted changes found. Please commit or stash them first." -ForegroundColor Yellow
        git status
        exit 1
    }

    # Switch to staging branch
    Write-Host "`nSwitching to staging branch..." -ForegroundColor Green
    git checkout staging

    # Pull latest changes from staging
    Write-Host "`nPulling latest changes from staging..." -ForegroundColor Green
    git pull origin staging

    # Install dependencies
    Write-Host "`nInstalling dependencies..." -ForegroundColor Green
    cd backend
    npm install
    cd ../frontend
    npm install
    cd ..

    # Run tests if they exist
    Write-Host "`nRunning tests..." -ForegroundColor Green
    if (Test-Path "backend/package.json") {
        $backendPackage = Get-Content "backend/package.json" | ConvertFrom-Json
        if ($backendPackage.scripts.test) {
            cd backend
            npm run test
            cd ..
        }
    }
    if (Test-Path "frontend/package.json") {
        $frontendPackage = Get-Content "frontend/package.json" | ConvertFrom-Json
        if ($frontendPackage.scripts.test) {
            cd frontend
            npm run test
            cd ..
        }
    }

    # Build both projects in staging mode
    Write-Host "`nBuilding projects in staging mode..." -ForegroundColor Green
    cd backend
    npm run build:staging
    cd ../frontend
    npm run build:staging
    cd ..

    # Add all changes
    Write-Host "`nAdding changes..." -ForegroundColor Green
    git add .

    # Get commit message from user
    $commitMessage = Read-Host "`nEnter commit message"
    if (-not $commitMessage) {
        $commitMessage = "Staging update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    # Commit changes
    Write-Host "`nCommitting changes..." -ForegroundColor Green
    git commit -m $commitMessage

    # Push to GitHub
    Write-Host "`nPushing to GitHub staging branch..." -ForegroundColor Green
    git push origin staging

    Write-Host "`nStaging deployment completed successfully!" -ForegroundColor Green
    Write-Host "Branch: staging" -ForegroundColor Cyan
    Write-Host "Commit: $commitMessage" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Cyan

} catch {
    Write-Host "`nDeployment failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}