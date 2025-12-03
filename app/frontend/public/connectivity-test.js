
// Frontend Connectivity Test
// Add this to your browser console to test API connectivity

async function testAPIConnectivity() {
  const API_BASE = 'http://localhost:3000/api';
  
  console.log('🔍 Testing API Connectivity...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${API_BASE}/../health`);
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
    const authResponse = await fetch(`${API_BASE}/profile`);
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
