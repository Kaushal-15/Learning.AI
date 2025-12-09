#!/bin/bash

echo "🧪 Testing Full Content Generation API"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Start server if not running
if ! pgrep -f "node.*server.js" > /dev/null; then
    echo "${YELLOW}Starting server...${NC}"
    node server.js &
    SERVER_PID=$!
    sleep 3
    echo "${GREEN}Server started (PID: $SERVER_PID)${NC}"
    echo ""
else
    echo "${GREEN}Server already running${NC}"
    echo ""
    SERVER_PID=""
fi

# Test text generation
echo "1️⃣  Testing TEXT generation..."
echo "------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "roadmap": "full-stack",
    "day": 1,
    "topic": "Introduction to Web Development",
    "subtopic": "HTML Basics",
    "content_type": "text"
  }')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "${GREEN}✅ Text generation SUCCESS${NC}"
    echo "$RESPONSE" | jq '.data | {conceptExplanation: .conceptExplanation[:100], keyPoints: .keyPoints}'
else
    echo "${RED}❌ Text generation FAILED${NC}"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test video generation
echo "2️⃣  Testing VIDEO generation..."
echo "------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "roadmap": "full-stack",
    "day": 1,
    "topic": "Introduction to Web Development",
    "subtopic": "HTML Basics",
    "content_type": "video"
  }')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "${GREEN}✅ Video generation SUCCESS${NC}"
    echo "$RESPONSE" | jq '.data | {videoCount: (.videos | length), firstVideo: .videos[0].title, embedUrl: .videos[0].embedUrl}'
else
    echo "${RED}❌ Video generation FAILED${NC}"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test audio generation
echo "3️⃣  Testing AUDIO generation..."
echo "------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "roadmap": "full-stack",
    "day": 1,
    "topic": "Introduction to Web Development",
    "subtopic": "HTML Basics",
    "content_type": "audio"
  }')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "${GREEN}✅ Audio generation SUCCESS${NC}"
    echo "$RESPONSE" | jq '.data | {title: .title, duration: .estimatedDuration, dialogueCount: (.dialogue | length)}'
else
    echo "${RED}❌ Audio generation FAILED${NC}"
    echo "$RESPONSE" | jq '.'
fi
echo ""

echo "======================================"
echo "${GREEN}✅ All tests completed!${NC}"
echo ""

# Kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping test server..."
    kill $SERVER_PID 2>/dev/null
fi
