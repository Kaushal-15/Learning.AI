# Quick Start Guide - Groq API Integration

## ✅ What Was Fixed

Your Groq API key is now properly integrated and working for all content generation types:
- ✅ Text content
- ✅ Video recommendations  
- ✅ Audio scripts
- ✅ Image/mindmap data
- ✅ Full learning modules

## 🚀 How to Start the Server

```bash
cd app/Backend
node server.js
```

Or use the startup script:
```bash
./start-server.sh
```

## 🧪 Testing

### 1. Verify API Keys
```bash
node verify-api-keys.js
```

### 2. Test Content Generation
```bash
# Test all content types
node test-all-content-types.js

# Test text generation specifically
node test-text-generation.js

# Test Groq API directly
node test-groq-api.js
```

### 3. Test API Endpoint (requires server running)
```bash
./test-api-endpoint.sh
```

Or manually with curl:
```bash
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "roadmap": "full-stack",
    "day": 1,
    "topic": "Introduction",
    "subtopic": "HTML Basics",
    "content_type": "text"
  }'
```

## 📊 Current Configuration

**API Keys Status:**
- ✅ Groq API: Working (Primary)
- ❌ Gemini API: Invalid (Optional)
- ✅ Template Fallback: Always available

**Priority Order:**
1. Groq API (fast, free, working)
2. Gemini API (fallback, currently invalid)
3. Templates (final fallback, always works)

## 🔧 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
pkill -f "node.*server.js"
```

### MongoDB not running
```bash
# Start MongoDB
sudo systemctl start mongod

# Check status
sudo systemctl status mongod
```

### Content generation fails
```bash
# Verify API keys
node verify-api-keys.js

# Check server logs for errors
# Look for [ContentGenerator] messages
```

## 📝 API Endpoints

### Generate Content
```
POST /api/content/generate
```

**Request Body:**
```json
{
  "roadmap": "full-stack",
  "day": 1,
  "topic": "Introduction to Web Development",
  "subtopic": "HTML Basics",
  "content_type": "text"
}
```

**Content Types:**
- `text` - Text explanations with code examples
- `video` - Video recommendations and scripts
- `audio` - Podcast-style dialogue
- `image` - Mindmap data
- `full_module` - Complete learning module

### Cache Statistics
```
GET /api/content/cache/stats
```

### Clear Cache
```
DELETE /api/content/cache/clear
```

## 🎯 What Changed

### Files Modified:
1. **services/contentGenerator.js**
   - Added lazy initialization for API clients
   - Improved JSON parsing
   - Added response_format for Groq

2. **routes/contentRoutes.js**
   - Updated API key validation to check both Groq and Gemini

### Files Created:
- `test-groq-api.js` - Test Groq connection
- `test-text-generation.js` - Test text generation
- `test-all-content-types.js` - Test all types
- `verify-api-keys.js` - Verify API configuration
- `start-server.sh` - Server startup script
- `test-api-endpoint.sh` - API endpoint test
- `GROQ_API_FIX_SUMMARY.md` - Detailed fix summary
- `QUICK_START.md` - This guide

## 💡 Tips

1. **Groq is fast and free** - Perfect for development
2. **Content is cached** - Reduces API calls and improves performance
3. **Templates always work** - System never fails completely
4. **Monitor logs** - Watch console for which API tier is being used

## 🔗 Useful Links

- Groq Console: https://console.groq.com/
- Gemini API Keys: https://aistudio.google.com/app/apikey
- Groq Models: https://console.groq.com/docs/models

## ✨ Next Steps

1. Start your server: `node server.js`
2. Test from your frontend application
3. Monitor the console logs to see Groq in action
4. (Optional) Get a valid Gemini API key for redundancy

Your system is now fully configured and ready to use! 🎉
