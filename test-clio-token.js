#!/usr/bin/env node

// Test the actual CLIO token from database directly
async function testClioToken() {
  const token = "21875-VyetI0Iqs8BQkx0oV7HXCY7OZqrBibMT2I";
  
  console.log('Testing CLIO token directly...');
  console.log('Token prefix:', token.substring(0, 10) + '...');
  
  try {
    const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CLIO-API-VERSION': '4'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS - CLIO API Response:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('❌ FAILED - Response body:', text);
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

testClioToken();
