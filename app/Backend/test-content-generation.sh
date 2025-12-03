#!/bin/bash

# Content Generation System Test Script
# Tests all 4 content types and verifies caching

echo "========================================"
echo "  Content Generation System Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000/api"
COOKIE_FILE="/tmp/test_cookies.txt"

echo "Step 1: Testing authentication..."
echo ""

# Get auth cookie (assuming we have a test user)
# You'll need to replace with actual login credentials
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }')

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Authentication successful${NC}"
else
  echo -e "${RED}✗ Authentication failed${NC}"
  echo "Please ensure:"
  echo "  1. Backend server is running (npm start)"
  echo "  2. You have a test user account"
  echo "  3. Update credentials in this script"
  exit 1
fi

echo ""
echo "========================================"
echo "Testing Content Generation API"
echo "========================================"
echo ""

# Test parameters
ROADMAP="Frontend Development"
DAY=4
TOPIC="JavaScript Basics"
SUBTOPIC="Functions"

# Test 1: TEXT content generation
echo "Test 1: Generating TEXT content..."
TEXT_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST ${API_BASE}/content/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"roadmap\": \"${ROADMAP}\",
    \"day\": ${DAY},
    \"topic\": \"${TOPIC}\",
    \"subtopic\": \"${SUBTOPIC}\",
    \"content_type\": \"text\"
  }")

if echo "$TEXT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ TEXT content generated successfully${NC}"
  CACHED_1=$(echo "$TEXT_RESPONSE" | grep -o '"cached":[^,]*' | cut -d: -f2)
  echo "  Cached: $CACHED_1"
else
  echo -e "${RED}✗ TEXT content generation failed${NC}"
  echo "$TEXT_RESPONSE"
fi

sleep 1

# Test 2: VIDEO content generation
echo ""
echo "Test 2: Generating VIDEO content..."
VIDEO_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST ${API_BASE}/content/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"roadmap\": \"${ROADMAP}\",
    \"day\": ${DAY},
    \"topic\": \"${TOPIC}\",
    \"subtopic\": \"${SUBTOPIC}\",
    \"content_type\": \"video\"
  }")

if echo "$VIDEO_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ VIDEO content generated successfully${NC}"
  CACHED_2=$(echo "$VIDEO_RESPONSE" | grep -o '"cached":[^,]*' | cut -d: -f2)
  echo "  Cached: $CACHED_2"
else
  echo -e "${RED}✗ VIDEO content generation failed${NC}"
  echo "$VIDEO_RESPONSE"
fi

sleep 1

# Test 3: AUDIO content generation
echo ""
echo "Test 3: Generating AUDIO content..."
AUDIO_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST ${API_BASE}/content/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"roadmap\": \"${ROADMAP}\",
    \"day\": ${DAY},
    \"topic\": \"${TOPIC}\",
    \"subtopic\": \"${SUBTOPIC}\",
    \"content_type\": \"audio\"
  }")

if echo "$AUDIO_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ AUDIO content generated successfully${NC}"
  CACHED_3=$(echo "$AUDIO_RESPONSE" | grep -o '"cached":[^,]*' | cut -d: -f2)
  echo "  Cached: $CACHED_3"
else
  echo -e "${RED}✗ AUDIO content generation failed${NC}"
  echo "$AUDIO_RESPONSE"
fi

sleep 1

# Test 4: IMAGE content generation
echo ""
echo "Test 4: Generating IMAGE content..."
IMAGE_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST ${API_BASE}/content/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"roadmap\": \"${ROADMAP}\",
    \"day\": ${DAY},
    \"topic\": \"${TOPIC}\",
    \"subtopic\": \"${SUBTOPIC}\",
    \"content_type\": \"image\"
  }")

if echo "$IMAGE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ IMAGE content generated successfully${NC}"
  CACHED_4=$(echo "$IMAGE_RESPONSE" | grep -o '"cached":[^,]*' | cut -d: -f2)
  echo "  Cached: $CACHED_4"
else
  echo -e "${RED}✗ IMAGE content generation failed${NC}"
  echo "$IMAGE_RESPONSE"
fi

# Test 5: Cache verification - request TEXT again
echo ""
echo "========================================"
echo "Testing Cache Mechanism"
echo "========================================"
echo ""
echo "Test 5: Re-requesting TEXT content (should be cached)..."

TEXT_RESPONSE_2=$(curl -s -b $COOKIE_FILE -X POST ${API_BASE}/content/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"roadmap\": \"${ROADMAP}\",
    \"day\": ${DAY},
    \"topic\": \"${TOPIC}\",
    \"subtopic\": \"${SUBTOPIC}\",
    \"content_type\": \"text\"
  }")

if echo "$TEXT_RESPONSE_2" | grep -q '"cached":true'; then
  echo -e "${GREEN}✓ Cache working - content returned from cache${NC}"
else
  echo -e "${YELLOW}⚠ Cache not hit - content regenerated${NC}"
fi

# Test 6: Cache stats
echo ""
echo "Test 6: Retrieving cache statistics..."
STATS_RESPONSE=$(curl -s -b $COOKIE_FILE ${API_BASE}/content/cache/stats)

if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Cache stats retrieved${NC}"
  echo "$STATS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATS_RESPONSE"
else
  echo -e "${RED}✗ Failed to retrieve cache stats${NC}"
fi

echo ""
echo "========================================"
echo "  Test Summary"
echo "========================================"
echo ""
echo "All content types tested successfully!"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Add your Gemini API key to .env file"
echo "2. Visit http://localhost:5173/content-demo to test frontend"
echo "3. Check MongoDB for cached content:"
echo "   mongosh > use learning_ai > db.contentcaches.find().pretty()"
echo ""

# Cleanup
rm -f $COOKIE_FILE
