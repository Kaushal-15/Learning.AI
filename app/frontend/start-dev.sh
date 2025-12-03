#!/bin/bash

# Frontend Startup Script
# Ensures everything is ready before starting the dev server

echo "🚀 Starting Frontend Development Server..."

# Check if backend is running
echo "📡 Checking backend connectivity..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not running. Please start backend first:"
    echo "   cd app/Backend && npm run dev"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🎯 Starting Vite development server..."
npm run dev
