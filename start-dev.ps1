# Start backend
Set-Location C:\UDAPP\backend
Start-Process powershell -ArgumentList "npm run dev"

# Start frontend
Set-Location C:\UDAPP\frontend
Start-Process powershell -ArgumentList "npm run dev"

# Return to root
Set-Location C:\UDAPP 