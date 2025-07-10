// Test the optimized API
const fetch = require('node-fetch');

async function testApi() {
  try {
    console.log('Testing API connection...');
    
    const response = await fetch('http://localhost:3001/api/samples?page=1&limit=5');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ API test successful');
    } else {
      console.log('❌ API test failed');
    }
  } catch (error) {
    console.error('❌ API test error:', error.message);
  }
}

testApi();