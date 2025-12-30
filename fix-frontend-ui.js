#!/usr/bin/env node

/**
 * Frontend UI Fix Script
 * Fixes routing and display issues in the frontend
 */

const fs = require('fs').promises;
const path = require('path');

async function fixFrontendUI() {
  console.log('🔧 Fixing Frontend UI Issues...\n');

  // 1. Fix App.jsx routing
  console.log('1. Fixing App.jsx routing...');
  
  const appJsxPath = 'app/frontend/src/App.jsx';
  try {
    let appContent = await fs.readFile(appJsxPath, 'utf8');
    
    // Check if AdaptiveQuizTest is already imported
    if (!appContent.includes('import AdaptiveQuizTest')) {
      // Add the import
      appContent = appContent.replace(
        'import ContentGeneratorDemo from "./components/ContentGeneratorDemo";',
        'import ContentGeneratorDemo from "./components/ContentGeneratorDemo";\nimport AdaptiveQuizTest from "./components/AdaptiveQuizTest";'
      );
      
      // Add the route
      appContent = appContent.replace(
        '          <Route path="/content-demo" element={<ContentGeneratorDemo />} />',
        '          <Route path="/content-demo" element={<ContentGeneratorDemo />} />\n          <Route path="/adaptive-quiz-test" element={<AdaptiveQuizTest />} />'
      );
      
      await fs.writeFile(appJsxPath, appContent);
      console.log('   ✅ Added AdaptiveQuizTest route to App.jsx');
    } else {
      console.log('   ✅ AdaptiveQuizTest route already exists');
    }
  } catch (error) {
    console.log('   ❌ Error fixing App.jsx:', error.message);
  }

  // 2. Check and fix Dashboard navigation
  console.log('\n2. Checking Dashboard navigation...');
  
  const dashboardPath = 'app/frontend/src/components/Dashboard.jsx';
  try {
    const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
    
    if (dashboardContent.includes('adaptive-quiz-test')) {
      console.log('   ✅ Dashboard has adaptive quiz test link');
    } else {
      console.log('   ⚠️  Dashboard may need adaptive quiz test link');
    }
  } catch (error) {
    console.log('   ❌ Error checking Dashboard:', error.message);
  }

  // 3. Create a test connectivity script
  console.log('\n3. Creating connectivity test...');
  
  const connectivityTest = `
// Frontend Connectivity Test
// Add this to your browser console to test API connectivity

async function testAPIConnectivity() {
  const API_BASE = 'http://localhost:3000/api';
  
  console.log('🔍 Testing API Connectivity...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(\`\${API_BASE}/../health\`);
    if (healthResponse.ok) {
      console.log('✅ Backend health check: OK');
    } else {
      console.log('❌ Backend health check failed');
    }
  } catch (error) {
    console.log('❌ Backend not reachable:', error.message);
  }
  
  try {
    // Test auth endpoint (should return 401 without token)
    const authResponse = await fetch(\`\${API_BASE}/profile\`);
    if (authResponse.status === 401) {
      console.log('✅ Auth endpoint working (401 expected)');
    } else {
      console.log('⚠️  Auth endpoint unexpected response:', authResponse.status);
    }
  } catch (error) {
    console.log('❌ Auth endpoint error:', error.message);
  }
  
  console.log('🏁 Connectivity test completed');
}

// Run the test
testAPIConnectivity();
`;

  await fs.writeFile('app/frontend/public/connectivity-test.js', connectivityTest);
  console.log('   ✅ Created connectivity test script');

  // 4. Create startup script
  console.log('\n4. Creating startup script...');
  
  const startupScript = `#!/bin/bash

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
`;

  await fs.writeFile('app/frontend/start-dev.sh', startupScript);
  console.log('   ✅ Created startup script');

  // 5. Update package.json scripts
  console.log('\n5. Updating package.json scripts...');
  
  try {
    const packageJsonPath = 'app/frontend/package.json';
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Add new scripts
    packageJson.scripts['start-with-check'] = 'bash start-dev.sh';
    packageJson.scripts['test-connectivity'] = 'node -e "console.log(\'Open browser console and run: fetch(\\\\"http://localhost:3000/health\\\\").then(r=>r.json()).then(console.log)\')"';
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Updated package.json with new scripts');
  } catch (error) {
    console.log('   ❌ Error updating package.json:', error.message);
  }

  // 6. Create troubleshooting guide
  console.log('\n6. Creating troubleshooting guide...');
  
  const troubleshootingGuide = `# Frontend UI Troubleshooting Guide

## Common Issues and Solutions

### 1. Blank/White Screen
**Symptoms**: Browser shows blank page or loading indefinitely
**Solutions**:
- Check browser console for JavaScript errors (F12 → Console)
- Verify backend is running: \`curl http://localhost:3000/health\`
- Clear browser cache and reload (Ctrl+Shift+R)
- Check if all components are properly imported in App.jsx

### 2. API Connection Errors
**Symptoms**: Network errors, 404s, CORS issues
**Solutions**:
- Ensure backend is running on port 3000
- Check VITE_API_BASE_URL in .env file
- Verify no firewall blocking localhost:3000
- Test connectivity: Open browser console and run connectivity test

### 3. Routing Issues
**Symptoms**: 404 errors when navigating, missing pages
**Solutions**:
- Check if routes are properly defined in App.jsx
- Verify component imports are correct
- Ensure ProtectedLayout is working for authenticated routes

### 4. Component Not Found
**Symptoms**: Module not found errors
**Solutions**:
- Check if component file exists in src/components/
- Verify import path is correct (case-sensitive)
- Ensure component is properly exported

## Quick Diagnostic Commands

\`\`\`bash
# Check if backend is running
curl http://localhost:3000/health

# Check frontend environment
cat app/frontend/.env

# Test API connectivity
npm run test-connectivity

# Start with automatic checks
npm run start-with-check
\`\`\`

## Browser Console Tests

Open browser console (F12) and run:

\`\`\`javascript
// Test API connectivity
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test authentication endpoint
fetch('http://localhost:3000/api/profile')
  .then(r => console.log('Auth status:', r.status))
  .catch(console.error);
\`\`\`

## Step-by-Step Debugging

1. **Check Backend**: \`cd app/Backend && npm run health-check\`
2. **Start Backend**: \`cd app/Backend && npm run dev\`
3. **Check Frontend Config**: \`cd app/frontend && cat .env\`
4. **Install Dependencies**: \`cd app/frontend && npm install\`
5. **Start Frontend**: \`cd app/frontend && npm run dev\`
6. **Open Browser**: Navigate to http://localhost:5173
7. **Check Console**: Press F12 and look for errors
8. **Test Navigation**: Try navigating to /dashboard, /adaptive-quiz-test

## Environment Checklist

- [ ] Backend running on port 3000
- [ ] Frontend .env configured with correct API URL
- [ ] No firewall blocking localhost ports
- [ ] Browser JavaScript enabled
- [ ] No browser extensions blocking requests
- [ ] Node.js version compatible (16+)
`;

  await fs.writeFile('FRONTEND_TROUBLESHOOTING.md', troubleshootingGuide);
  console.log('   ✅ Created troubleshooting guide');

  console.log('\n🎉 Frontend UI fixes completed!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Start backend: cd app/Backend && npm run dev');
  console.log('   2. Start frontend: cd app/frontend && npm run start-with-check');
  console.log('   3. Open browser: http://localhost:5173');
  console.log('   4. Navigate to: /adaptive-quiz-test');
  console.log('   5. Check browser console for any errors');
  console.log('\n📖 If issues persist, check FRONTEND_TROUBLESHOOTING.md');
}

fixFrontendUI().catch(error => {
  console.error('❌ Frontend fix failed:', error.message);
  process.exit(1);
});