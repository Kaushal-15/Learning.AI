#!/bin/bash

echo "🔄 Restarting Backend Server Only..."

# Kill backend process
echo "1. Stopping backend server..."
pkill -f "node.*server.js" || pkill -f "npm.*start"
sleep 2

# Start backend
echo "2. Starting backend server..."
cd app/Backend
npm start &
BACKEND_PID=$!

echo "✅ Backend restarted (PID: $BACKEND_PID)"
echo "🌐 Backend running on: http://localhost:3000"
echo ""
echo "📋 To test quiz creation:"
echo "   1. Go to frontend: http://localhost:5173"
echo "   2. Navigate to any learning path"
echo "   3. Click 'Take Quiz' and check backend console logs"
echo ""
echo "🔍 Backend logs will show detailed quiz creation process"