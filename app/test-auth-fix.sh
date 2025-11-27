#!/bin/bash

# Authentication Fix Instructions and Test Script
# ================================================

echo "🔧 Authentication Fix - Step-by-Step Instructions"
echo "================================================="
echo ""

# Step 1: Check if PEPPER exists in .env
echo "📋 Step 1: Checking .env configuration..."
if grep -q "^PEPPER=" /mnt/extrastorage/Learning.ai/app/Backend/.env 2>/dev/null; then
    echo "✅ PEPPER variable found in .env"
else
    echo "❌ PEPPER variable NOT found in .env"
    echo ""
    echo "🛠️  ACTION REQUIRED:"
    echo "   Open: /mnt/extrastorage/Learning.ai/app/Backend/.env"
    echo "   Add this line after the COOKIE configuration:"
    echo ""
    echo "   PEPPER=learning-ai-pepper-secret-key-for-password-hashing-987654321"
    echo ""
    echo "   ⚠️  IMPORTANT: If you have existing users in the database, they may not"
    echo "   be able to login with a new PEPPER value. You may need to:"
    echo "   - Use the same PEPPER that was used during registration, OR"
    echo "   - Register a new test user"
    echo ""
fi

echo ""
echo "📋 Step 2: Verifying backend endpoint..."
if grep -q "router.get('/me'" /mnt/extrastorage/Learning.ai/app/Backend/routes/userRoutes.js 2>/dev/null; then
    echo "✅ /me endpoint added to userRoutes.js"
else
    echo "❌ /me endpoint NOT found in userRoutes.js"
fi

echo ""
echo "📋 Step 3: Current server status..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Backend server is running (will auto-restart with nodemon)"
else
    echo "⚠️  Backend server not detected. Start with: npm run dev"
fi

if pgrep -f "vite" > /dev/null; then
    echo "✅ Frontend server is running"
else
    echo "⚠️  Frontend server not detected. Start with: npm run dev"
fi

echo ""
echo "================================================="
echo "🧪 Testing Instructions:"
echo "================================================="
echo ""
echo "1. Add PEPPER to .env file (see above)"
echo "2. Backend will auto-restart (nodemon)"
echo "3. Open browser: http://localhost:5173/login"
echo "4. Try logging in with existing credentials"
echo ""
echo "Expected Results:"
echo "  ✅ Login succeeds (no 401 error)"
echo "  ✅ Dashboard loads after login"
echo "  ✅ Backend logs show: POST /api/auth/login - 200"
echo "  ✅ Backend logs show: GET /api/profile/me - 200"
echo ""
echo "If login fails with 401:"
echo "  → Register a new user at: http://localhost:5173/signup"
echo "  → The new user should work with the new PEPPER value"
echo ""
