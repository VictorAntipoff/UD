# Start backend server
Start-Process powershell -ArgumentList "-NoExit", "cd backend; npm run dev"

# Start frontend server
Start-Process powershell -ArgumentList "-NoExit", "cd frontend; npm run dev" 