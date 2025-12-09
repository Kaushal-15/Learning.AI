#!/bin/bash

echo "🃏 Testing Flashcard API Endpoint"
echo "=================================="
echo ""

# Start server if not running
if ! pgrep -f "node.*server.js" > /dev/null; then
    echo "Starting server..."
    node server.js &
    SERVER_PID=$!
    sleep 3
    echo "Server started (PID: $SERVER_PID)"
    echo ""
else
    echo "Server already running"
    echo ""
    SERVER_PID=""
fi

# Test flashcard generation
echo "Testing flashcard generation..."
echo "------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "roadmap": "full-stack",
    "day": 1,
    "topic": "Introduction to Web Development",
    "subtopic": "HTML Basics",
    "content_type": "flashcards"
  }')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Flashcard generation SUCCESS"
    echo ""
    echo "Response Summary:"
    echo "$RESPONSE" | jq '{
      success: .success,
      cached: .cached,
      totalCards: .data.totalCards,
      categories: .data.categories,
      studyTime: .data.estimatedStudyTime,
      sampleCard: .data.flashcards[0]
    }'
    echo ""
    echo "All Flashcards:"
    echo "$RESPONSE" | jq '.data.flashcards[] | "[\(.category)] \(.front)"'
else
    echo "❌ Flashcard generation FAILED"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping test server..."
    kill $SERVER_PID 2>/dev/null
fi

echo "=================================="
echo "✅ Test completed!"
