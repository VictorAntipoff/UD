Write-Host "`nStarting cleanup..."

# Kill processes
Write-Host "Stopping Node processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Remove directories and files
Write-Host "Removing directories and files..."
$itemsToRemove = @(
    "node_modules",
    "dist",
    ".prisma",
    "package-lock.json"
)

foreach ($item in $itemsToRemove) {
    if (Test-Path $item) {
        Remove-Item -Recurse -Force $item
        Write-Host "Removed $item"
    }
}

Write-Host "Cleanup complete!`n" 