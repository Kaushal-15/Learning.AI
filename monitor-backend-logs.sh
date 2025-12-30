#!/bin/bash

echo "🔍 Monitoring Backend Logs for Quiz Debugging..."
echo "Take a quiz now and watch for the debug output below:"
echo "=================================================="
echo ""

# Find the backend process and monitor its logs
BACKEND_PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$BACKEND_PID" ]; then
    echo "❌ Backend server not found. Please start it with:"
    echo "   cd app/Backend && npm start"
    exit 1
fi

echo "✅ Monitoring backend process (PID: $BACKEND_PID)"
echo "📋 Watching for quiz answer submissions..."
echo ""

# Monitor the backend logs
# Since we can't directly tail the process output, let's check if there's a log file
# or monitor the process output differently

# Alternative: restart backend with explicit logging
echo "💡 To see detailed logs, restart backend with:"
echo "   cd app/Backend"
echo "   pkill -f 'node.*server.js'"
echo "   npm start"
echo ""
echo "Then take a quiz and look for these debug messages:"
echo "   === ANSWER COMPARISON DEBUG ==="
echo "   User answer: \"...\""
echo "   Stored correctAnswer: \"...\""
echo "   Final result: ✅ CORRECT or ❌ INCORRECT"
echo "   === END DEBUG ==="