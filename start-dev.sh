#!/bin/bash

# Store the root directory
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to start a new terminal window
function new_terminal() {
    local dir=$1
    local command=$2
    
    osascript -e "
        tell application \"Terminal\"
            do script \"cd '$dir' && $command\"
            activate
        end tell"
}

# Kill any process running on our ports
kill_port() {
    local port=$1
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
}

# Kill existing processes on our ports
kill_port 3010
kill_port 3020

# Clear the terminal
clear

echo "🚀 Starting UDesign Development Servers..."
echo "================================================="

# Start backend first
echo -e "\n📡 Starting backend server..."
cd "$ROOT_DIR/backend" || exit 1
new_terminal "$ROOT_DIR/backend" "npm run dev"

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
until curl -s http://localhost:3010/api/health > /dev/null; do
    sleep 1
done
echo "✅ Backend is running on port 3010"

# Start frontend
echo -e "\n🌐 Starting frontend server..."
cd "$ROOT_DIR/frontend" || exit 1
new_terminal "$ROOT_DIR/frontend" "VITE_PORT=3020 npm run dev"

echo -e "\n✨ Development servers started!"
echo "================================================="
echo "Frontend: http://localhost:3020"
echo "Backend:  http://localhost:3010"
echo "=================================================" 