#!/bin/bash

echo "🧪 Testing Content Generation API Endpoint"
echo ""

# Start server in background if not running
if ! pgrep -f "node.*server.js" > /dev/null; then
    echo "Starting server..."
    node server.js &
    SERVER_PID=$!
    sleep 3
    echo "Server started (PID: $SERVER_PID)"
else
    echo "Server already running"
    SERVER_PID=""
fi

echo ""
echo "Testing text content generation..."
echo ""

# Test the API endpoint
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "roadmap": "full-stack",
    "day": 1,
    "topic": "Introduction to Web Development",
    "subtopic": "HTML Basics",
    "content_type": "text"
  }' \
  -s | jq '.'

echo ""
echo "✅ Test complete!"

# Kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping test server..."
    kill $SERVER_PID 2>/dev/null
fi
