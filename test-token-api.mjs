// Test token storage functionality directly through API endpoints

console.log('🔍 Testing CLIO Token Storage via API...');
console.log('');

async function testTokenStorageAPI() {
  const baseUrl = 'https://mdrxlaw.vercel.app';
  
  try {
    console.log('=== STEP 1: Check Current Status ===');
    const statusResponse = await fetch(`${baseUrl}/api/debug/status-test`);
    const statusData = await statusResponse.json();
    console.log('Current status:', statusData);
    
    console.log('');
    console.log('=== STEP 2: Test RLS Operations ===');
    const rlsResponse = await fetch(`${baseUrl}/api/debug/rls-test`);
    const rlsData = await rlsResponse.json();
    console.log('RLS test result:', rlsData);
    
    console.log('');
    console.log('=== STEP 3: Test OAuth Flow Components ===');
    const oauthResponse = await fetch(`${baseUrl}/api/debug/oauth-test`);
    const oauthData = await oauthResponse.json();
    console.log('OAuth test result:', oauthData);
    
    console.log('');
    console.log('=== STEP 4: Create Direct Database Test ===');
    // Create a test endpoint to specifically check token storage
    
  } catch (error) {
    console.error('❌ Error testing via API:', error.message);
  }
}

testTokenStorageAPI();
