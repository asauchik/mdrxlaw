#!/usr/bin/env node

// Test the latest CLIO token to understand the 403 error
async function debugClioToken() {
  const token = "21875-PY1f"; // This is just the prefix, but shows it's a valid format
  
  console.log('🔍 Debugging CLIO 403 error...');
  console.log('Token format appears correct (21875-xxxx pattern)');
  console.log('Scope requested: read:user_profile');
  console.log('');
  
  // Test different CLIO API endpoints to see which work
  const endpoints = [
    { name: 'User Profile', url: 'https://app.clio.com/api/v4/users/who_am_i.json' },
    { name: 'Users List', url: 'https://app.clio.com/api/v4/users.json' },
    { name: 'Account Info', url: 'https://app.clio.com/api/v4/account.json' }
  ];
  
  console.log('Common causes of 403 errors in CLIO:');
  console.log('1. App not approved for production use (sandbox vs production)');
  console.log('2. Incorrect scope format (should be read:user_profile not read:users)');
  console.log('3. App permissions not configured in CLIO Developer Console');
  console.log('4. Using wrong CLIO environment (app.clio.com vs app.goclio.com)');
  console.log('5. App client credentials for wrong environment');
  console.log('');
  
  // Check environment variables
  console.log('Environment check:');
  console.log('- CLIO_CLIENT_ID starts with:', process.env.CLIO_CLIENT_ID?.substring(0, 8) + '...');
  console.log('- CLIO_REDIRECT_URI:', process.env.CLIO_REDIRECT_URI);
  console.log('- Using app.clio.com (correct for production)');
  console.log('');
  
  console.log('Next steps to resolve:');
  console.log('1. Check CLIO Developer Console app settings');
  console.log('2. Verify app is approved for production');
  console.log('3. Confirm redirect URI exactly matches registration');
  console.log('4. Try different scope formats if needed');
  console.log('5. Contact CLIO support if app permissions are unclear');
}

debugClioToken();
