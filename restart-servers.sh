#!/bin/bash

echo "🔄 Restarting Servers for Quiz Fixes..."
echo ""

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "🔪 Killing process on port $port (PID: $pid)"
        kill -9 $pid
        sleep 1
    fi
}

# Kill existing processes
echo "1. Stopping existing servers..."
kill_port 3000  # Backend
kill_port 5173  # Frontend (Vite)
kill_port 3001  # Alternative frontend port

echo ""
echo "2. Starting Backend Server..."
cd app/Backend
npm start &
BACKEND_PID=$!
echo "   🚀 Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

echo ""
echo "3. Starting Frontend Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "   🚀 Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✅ Servers restarted successfully!"
echo ""
echo "📋 Access your application:"
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔧 Backend:  http://localhost:3000"
echo ""
echo "🧪 To test quiz functionality:"
echo "   1. Navigate to a learning path"
echo "   2. Click on any day"
echo "   3. Click 'Take Quiz' button"
echo "   4. Complete quiz with >60% to mark day complete"
echo ""
echo "🔍 Check browser console for detailed logs"
echo "📊 Backend logs will show completion status"

# Keep script running to show process info
echo ""
echo "Press Ctrl+C to stop both servers"
wait