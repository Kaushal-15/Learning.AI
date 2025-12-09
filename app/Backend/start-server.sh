#!/bin/bash

echo "🚀 Starting Learning.AI Backend Server..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

# Check for API keys
if ! grep -q "GROQ_API_KEY=gsk_" .env && ! grep -q "GEMINI_API_KEY=AIza" .env; then
    echo "⚠️  Warning: No valid API keys found in .env"
    echo "The system will use template fallback for content generation"
    echo ""
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  Warning: MongoDB doesn't appear to be running"
    echo "Please start MongoDB with: sudo systemctl start mongod"
    echo ""
fi

# Kill any existing server process
pkill -f "node.*server.js" 2>/dev/null

# Start the server
echo "Starting server on port ${PORT:-3000}..."
node server.js
