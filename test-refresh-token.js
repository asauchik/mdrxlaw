#!/usr/bin/env node

// Test refresh token 
async function testRefreshToken() {
  const refreshToken = "NqlC8mACghvV8yUCCJcJrtzHUTnZZ5jgGxgxQjrm";
  const clientId = "N3J6ExSSeeVk9WOjRG6FtoXgegEc07VBckudcTGB";
  const clientSecret = "ZZv2o394wcoRVl5eXIfhlUGsNUbsEIrcebO08zMc";
  
  console.log('Testing CLIO refresh token...');
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  try {
    const response = await fetch('https://app.clio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });
    
    console.log('Refresh response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS - New tokens:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('❌ FAILED - Response:', text);
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

testRefreshToken();
