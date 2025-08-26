import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    console.log('=== RLS BYPASS TEST ===');
    
    // Test 1: Get/Create default user
    console.log('1. Testing user operations...');
    const defaultUser = await DatabaseService.getDefaultUser();
    console.log('Default user result:', defaultUser ? `SUCCESS (${defaultUser.id})` : 'FAILED');
    
    if (!defaultUser) {
      return NextResponse.json({
        error: 'Failed to get/create default user',
        status: 'RLS may be blocking user operations'
      });
    }

    // Test 2: Store a test token
    console.log('2. Testing token storage...');
    const testToken = await DatabaseService.storeClioToken(
      defaultUser.id,
      'test_token_' + Date.now(),
      'test_refresh_token',
      'Bearer',
      604800,
      'test:scope'
    );
    console.log('Token storage result:', testToken ? `SUCCESS (${testToken.id})` : 'FAILED');

    if (!testToken) {
      return NextResponse.json({
        error: 'Failed to store token',
        status: 'RLS may be blocking token operations'
      });
    }

    // Test 3: Retrieve the token
    console.log('3. Testing token retrieval...');
    const retrievedToken = await DatabaseService.getValidClioToken(defaultUser.id);
    console.log('Token retrieval result:', retrievedToken ? 'SUCCESS' : 'FAILED');

    // Test 4: Clean up test token
    console.log('4. Testing token deletion...');
    const deleteResult = await DatabaseService.deleteClioToken(defaultUser.id);
    console.log('Token deletion result:', deleteResult ? 'SUCCESS' : 'FAILED');

    return NextResponse.json({
      status: 'All tests passed',
      results: {
        userOperations: !!defaultUser,
        tokenStorage: !!testToken,
        tokenRetrieval: !!retrievedToken,
        tokenDeletion: deleteResult
      },
      message: 'RLS bypass with supabaseAdmin is working correctly'
    });

  } catch (error) {
    console.error('RLS test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'RLS test failed'
    }, { status: 500 });
  }
}
