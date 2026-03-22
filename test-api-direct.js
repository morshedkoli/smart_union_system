// Test by making a request to our own API with detailed logging
const { default: fetch } = require('node-fetch');

async function testApiDirectly() {
  try {
    console.log('Testing login API directly...');

    const url = 'http://localhost:3000/api/auth/login';
    const body = {
      email: 'dev.admin@smartunion.local',
      password: 'Dev@12345'
    };

    console.log(`\nMaking request to: ${url}`);
    console.log(`Body: ${JSON.stringify(body)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log(`\nResponse:`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Status text: ${response.statusText}`);

    const result = await response.json();
    console.log(`  Body: ${JSON.stringify(result, null, 2)}`);

    // Check response headers for any additional info
    console.log(`\nHeaders:`);
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

  } catch (error) {
    console.error('❌ Error making API request:', error);
  }
}

// Also test if server is responding
async function checkServer() {
  try {
    console.log('Checking if server is responding...');
    const response = await fetch('http://localhost:3000/api/auth/dev-quick-login');
    console.log(`Health check status: ${response.status}`);
  } catch (error) {
    console.error('❌ Server not responding:', error.message);
  }
}

async function runTests() {
  await checkServer();
  await testApiDirectly();
}

runTests().catch(console.error);