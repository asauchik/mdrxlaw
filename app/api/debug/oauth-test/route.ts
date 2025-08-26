import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    console.log('🧪 OAuth Flow Test Starting...');
    
    // Step 1: Verify database connectivity
    console.log('1️⃣ Testing database connectivity...');
    const defaultUser = await DatabaseService.getDefaultUser();
    
    if (!defaultUser) {
      return NextResponse.json({
        success: false,
        step: 1,
        error: 'Failed to get/create default user'
      });
    }
    
    console.log('✅ Default user OK:', defaultUser.id);

    // Step 2: Test token storage (simulate OAuth callback)
    console.log('2️⃣ Testing token storage...');
    const mockTokenData = {
      access_token: 'mock_clio_token_' + Date.now(),
      refresh_token: 'mock_refresh_token',
      expires_in: 604800,
      token_type: 'Bearer',
      scope: 'read:user_profile read:contacts'
    };

    const storedToken = await DatabaseService.storeClioToken(
      defaultUser.id,
      mockTokenData.access_token,
      mockTokenData.refresh_token,
      mockTokenData.token_type,
      mockTokenData.expires_in,
      mockTokenData.scope
    );

    if (!storedToken) {
      return NextResponse.json({
        success: false,
        step: 2,
        error: 'Failed to store token'
      });
    }

    console.log('✅ Token stored OK:', storedToken.id);

    // Step 3: Test token retrieval (simulate status check)
    console.log('3️⃣ Testing token retrieval...');
    const retrievedToken = await DatabaseService.getValidClioToken(defaultUser.id);

    if (!retrievedToken) {
      return NextResponse.json({
        success: false,
        step: 3,
        error: 'Failed to retrieve valid token'
      });
    }

    console.log('✅ Token retrieved OK');

    // Step 4: Test token with mock CLIO API call
    console.log('4️⃣ Testing mock CLIO API call...');
    
    // Since we're using a mock token, this will fail, but we can see the flow
    const mockApiResponse = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
      headers: {
        'Authorization': `Bearer ${retrievedToken}`,
        'Content-Type': 'application/json',
        'X-CLIO-API-VERSION': '4'
      },
    });

    console.log('Mock API response status:', mockApiResponse.status);

    // Step 5: Clean up test token
    console.log('5️⃣ Cleaning up test token...');
    await DatabaseService.deleteClioToken(defaultUser.id);
    console.log('✅ Test token cleaned up');

    return NextResponse.json({
      success: true,
      message: 'OAuth flow test completed successfully',
      results: {
        step1_database: '✅ Working',
        step2_tokenStorage: '✅ Working', 
        step3_tokenRetrieval: '✅ Working',
        step4_mockApiCall: `Status: ${mockApiResponse.status}`,
        step5_cleanup: '✅ Working'
      },
      conclusion: 'Database operations work perfectly. Issue may be in OAuth callback or status endpoint logic.'
    });

  } catch (error) {
    console.error('OAuth test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
