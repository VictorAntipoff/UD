param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('staging', 'main')]
    [string]$Branch,

    [Parameter(Mandatory=$false)]
    [string]$CommitMessage
)

Write-Host "`nStarting deployment to $Branch..." -ForegroundColor Cyan

try {
    # Check if there are uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Host "`nUncommitted changes found. Please commit or stash them first." -ForegroundColor Yellow
        git status
        exit 1
    }

    # Switch to specified branch
    Write-Host "`nSwitching to $Branch branch..." -ForegroundColor Green
    git checkout $Branch

    # Pull latest changes
    Write-Host "`nPulling latest changes from $Branch..." -ForegroundColor Green
    git pull origin $Branch

    # Run tests
    Write-Host "`nRunning tests..." -ForegroundColor Green
    cd backend
    npm run test
    cd ../frontend
    npm run test
    cd ..

    # Build projects
    Write-Host "`nBuilding projects..." -ForegroundColor Green
    if ($Branch -eq 'staging') {
        cd backend
        npm run build:staging
        cd ../frontend
        npm run build:staging
        cd ..
    } else {
        cd backend
        npm run build
        cd ../frontend
        npm run build
        cd ..
    }

    # Add all changes
    Write-Host "`nAdding changes..." -ForegroundColor Green
    git add .

    # Get commit message if not provided
    if (-not $CommitMessage) {
        $CommitMessage = Read-Host "`nEnter commit message"
        if (-not $CommitMessage) {
            $CommitMessage = "$Branch update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
    }

    # Commit changes
    Write-Host "`nCommitting changes..." -ForegroundColor Green
    git commit -m $CommitMessage

    # Push to GitHub
    Write-Host "`nPushing to GitHub $Branch branch..." -ForegroundColor Green
    git push origin $Branch

    Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
    Write-Host "Branch: $Branch" -ForegroundColor Cyan
    Write-Host "Commit: $CommitMessage" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Cyan

} catch {
    Write-Host "`nDeployment failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} 