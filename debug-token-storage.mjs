import { DatabaseService } from './lib/database.js';

console.log('🔍 Testing CLIO Token Storage...');
console.log('');

async function debugTokenStorage() {
  try {
    console.log('=== STEP 1: Check Default User ===');
    const defaultUser = await DatabaseService.getDefaultUser();
    if (defaultUser) {
      console.log('✅ Default user found:', {
        id: defaultUser.id,
        email: defaultUser.email,
        created_at: defaultUser.created_at
      });
    } else {
      console.log('❌ No default user found');
      return;
    }
    
    console.log('');
    console.log('=== STEP 2: Check Existing Tokens ===');
    const existingTokens = await DatabaseService.getAllTokens();
    console.log('Existing tokens count:', existingTokens.length);
    existingTokens.forEach((token, index) => {
      console.log(`Token ${index + 1}:`, {
        id: token.id,
        user_id: token.user_id,
        token_type: token.token_type,
        has_access_token: !!token.access_token,
        has_refresh_token: !!token.refresh_token,
        expires_in: token.expires_in,
        created_at: token.created_at
      });
    });
    
    console.log('');
    console.log('=== STEP 3: Test Token Storage ===');
    const testToken = await DatabaseService.storeClioToken(
      defaultUser.id,
      'test_access_token_' + Date.now(),
      'test_refresh_token_' + Date.now(),
      'Bearer',
      3600,
      'read write'
    );
    
    if (testToken) {
      console.log('✅ Test token stored successfully:', {
        id: testToken.id,
        user_id: testToken.user_id,
        token_type: testToken.token_type,
        expires_in: testToken.expires_in,
        scope: testToken.scope
      });
    } else {
      console.log('❌ Failed to store test token');
    }
    
    console.log('');
    console.log('=== STEP 4: Test Token Retrieval ===');
    const retrievedToken = await DatabaseService.getClioToken(defaultUser.id);
    if (retrievedToken) {
      console.log('✅ Token retrieved successfully:', {
        id: retrievedToken.id,
        user_id: retrievedToken.user_id,
        has_access_token: !!retrievedToken.access_token,
        has_refresh_token: !!retrievedToken.refresh_token,
        token_type: retrievedToken.token_type,
        expires_in: retrievedToken.expires_in,
        scope: retrievedToken.scope,
        created_at: retrievedToken.created_at
      });
    } else {
      console.log('❌ Failed to retrieve token');
    }
    
    console.log('');
    console.log('=== STEP 5: Check All Tokens Again ===');
    const finalTokens = await DatabaseService.getAllTokens();
    console.log('Final token count:', finalTokens.length);
    finalTokens.forEach((token, index) => {
      console.log(`Token ${index + 1}:`, {
        id: token.id,
        user_id: token.user_id,
        token_type: token.token_type,
        has_access_token: !!token.access_token,
        has_refresh_token: !!token.refresh_token,
        expires_in: token.expires_in,
        created_at: token.created_at
      });
    });
    
    console.log('');
    console.log('=== CLEANUP: Remove Test Token ===');
    const deleted = await DatabaseService.deleteClioToken(defaultUser.id);
    console.log('Test token deleted:', deleted);
    
  } catch (error) {
    console.error('❌ Error during token storage test:', error);
  }
}

debugTokenStorage();
