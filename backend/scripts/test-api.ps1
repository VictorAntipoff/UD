# Test health
Write-Host "Testing health endpoint..."
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3020/api/health"
    Write-Host "Health check successful"
    $health
} catch {
    Write-Host "Health check failed"
    Write-Host $_.Exception.Message
}

# Login
Write-Host "`nTesting login..."
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $auth = Invoke-RestMethod `
        -Uri "http://localhost:3020/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "Login successful"
    Write-Host "Token: $($auth.token.Substring(0, 20))..."

    # Test users endpoint
    Write-Host "`nTesting users endpoint..."
    $headers = @{ 
        "Authorization" = "Bearer $($auth.token)"
        "Content-Type" = "application/json"
    }

    $users = Invoke-RestMethod `
        -Uri "http://localhost:3020/api/users" `
        -Method Get `
        -Headers $headers
    
    Write-Host "Users endpoint successful"
    $users | Format-Table
} catch {
    Write-Host "Test failed"
    Write-Host $_.Exception.Message
}