import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing OAuth callback token storage scenario...');
    
    const results: any = {
      step1_defaultUser: null,
      step2_mockTokenData: null,
      step3_storeToken: null,
      step4_retrieveToken: null,
      step5_cleanup: null,
      logs: []
    };
    
    // Step 1: Get default user (same as OAuth callback)
    console.log('Step 1: Getting default user...');
    results.logs.push('Step 1: Getting default user...');
    
    const defaultUser = await DatabaseService.getDefaultUser();
    if (defaultUser) {
      results.step1_defaultUser = {
        success: true,
        userId: defaultUser.id,
        email: defaultUser.email
      };
      console.log('✅ Default user found:', defaultUser.id);
      results.logs.push(`✅ Default user found: ${defaultUser.id}`);
    } else {
      results.step1_defaultUser = { success: false, error: 'No default user' };
      console.log('❌ No default user found');
      results.logs.push('❌ No default user found');
      return NextResponse.json({ error: 'No default user', results });
    }
    
    // Step 2: Mock token data (like what CLIO would return)
    console.log('Step 2: Preparing mock token data...');
    results.logs.push('Step 2: Preparing mock token data...');
    
    const mockTokenData = {
      access_token: `test_access_token_${Date.now()}`,
      refresh_token: `test_refresh_token_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 604800, // 7 days like CLIO
      scope: 'read write'
    };
    
    results.step2_mockTokenData = {
      success: true,
      hasAccessToken: !!mockTokenData.access_token,
      hasRefreshToken: !!mockTokenData.refresh_token,
      tokenType: mockTokenData.token_type,
      expiresIn: mockTokenData.expires_in,
      scope: mockTokenData.scope
    };
    console.log('✅ Mock token data prepared');
    results.logs.push('✅ Mock token data prepared');
    
    // Step 3: Store token (exact same call as OAuth callback)
    console.log('Step 3: Storing token in database...');
    results.logs.push('Step 3: Storing token in database...');
    
    const storedToken = await DatabaseService.storeClioToken(
      defaultUser.id,
      mockTokenData.access_token,
      mockTokenData.refresh_token,
      mockTokenData.token_type,
      mockTokenData.expires_in,
      mockTokenData.scope
    );
    
    if (storedToken) {
      results.step3_storeToken = {
        success: true,
        tokenId: storedToken.id,
        userId: storedToken.user_id,
        tokenType: storedToken.token_type,
        expiresIn: storedToken.expires_in,
        createdAt: storedToken.created_at
      };
      console.log('✅ Token stored successfully:', storedToken.id);
      results.logs.push(`✅ Token stored successfully: ${storedToken.id}`);
    } else {
      results.step3_storeToken = { success: false, error: 'Failed to store token' };
      console.log('❌ Failed to store token');
      results.logs.push('❌ Failed to store token');
      return NextResponse.json({ error: 'Token storage failed', results });
    }
    
    // Step 4: Retrieve token (like status endpoint does)
    console.log('Step 4: Retrieving stored token...');
    results.logs.push('Step 4: Retrieving stored token...');
    
    const retrievedToken = await DatabaseService.getClioToken(defaultUser.id);
    if (retrievedToken) {
      results.step4_retrieveToken = {
        success: true,
        tokenId: retrievedToken.id,
        userId: retrievedToken.user_id,
        hasAccessToken: !!retrievedToken.access_token,
        hasRefreshToken: !!retrievedToken.refresh_token,
        tokenType: retrievedToken.token_type,
        expiresIn: retrievedToken.expires_in,
        createdAt: retrievedToken.created_at,
        isExpired: await DatabaseService.isTokenExpired(retrievedToken)
      };
      console.log('✅ Token retrieved successfully:', retrievedToken.id);
      results.logs.push(`✅ Token retrieved successfully: ${retrievedToken.id}`);
    } else {
      results.step4_retrieveToken = { success: false, error: 'Failed to retrieve token' };
      console.log('❌ Failed to retrieve token');
      results.logs.push('❌ Failed to retrieve token');
    }
    
    // Step 5: Cleanup (remove test token)
    console.log('Step 5: Cleaning up test token...');
    results.logs.push('Step 5: Cleaning up test token...');
    
    const deleted = await DatabaseService.deleteClioToken(defaultUser.id);
    if (deleted) {
      results.step5_cleanup = { success: true, deleted: true };
      console.log('✅ Test token cleaned up');
      results.logs.push('✅ Test token cleaned up');
    } else {
      results.step5_cleanup = { success: false, error: 'Failed to cleanup token' };
      console.log('⚠️ Failed to cleanup test token');
      results.logs.push('⚠️ Failed to cleanup test token');
    }
    
    // Final summary
    const allSuccessful = [
      results.step1_defaultUser?.success,
      results.step2_mockTokenData?.success,
      results.step3_storeToken?.success,
      results.step4_retrieveToken?.success,
      results.step5_cleanup?.success
    ].every(Boolean);
    
    console.log('🎯 OAuth callback simulation completed');
    results.logs.push('🎯 OAuth callback simulation completed');
    
    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful 
        ? 'OAuth callback token storage simulation completed successfully' 
        : 'Some steps failed in OAuth callback simulation',
      results,
      conclusion: allSuccessful 
        ? 'Token storage mechanism is working correctly. Issue might be elsewhere.' 
        : 'Token storage mechanism has issues that need investigation.'
    });
    
  } catch (error) {
    console.error('❌ Error in OAuth callback simulation:', error);
    return NextResponse.json({
      error: 'OAuth callback simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
