import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Status Logic Test Starting...');
    
    // Replicate the exact logic from /api/clio/status
    console.log('1️⃣ Checking CLIO environment variables...');
    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioClientSecret = process.env.CLIO_CLIENT_SECRET;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    console.log('- CLIO_CLIENT_ID:', clioClientId ? '✅ Present' : '❌ Missing');
    console.log('- CLIO_CLIENT_SECRET:', clioClientSecret ? '✅ Present' : '❌ Missing');
    console.log('- CLIO_REDIRECT_URI:', clioRedirectUri ? '✅ Present' : '❌ Missing');

    if (!clioClientId || !clioClientSecret || !clioRedirectUri) {
      return NextResponse.json({
        error: 'CLIO environment variables not configured'
      });
    }

    console.log('2️⃣ Checking database for token...');
    let accessToken = null;
    
    try {
      const defaultUser = await DatabaseService.getDefaultUser();
      if (defaultUser) {
        console.log('- Found default user:', defaultUser.id);
        accessToken = await DatabaseService.getValidClioToken(defaultUser.id);
        console.log('- Database token check:', accessToken ? 'Found valid token' : 'No valid token');
      } else {
        console.log('- No default user found');
      }
    } catch (dbError) {
      console.error('- Database error:', dbError);
    }

    if (!accessToken) {
      console.log('3️⃣ No token found - this should trigger "Please connect to CLIO"');
      return NextResponse.json({
        isConnected: false,
        error: 'No access token found. Please connect to CLIO.',
        debug: {
          step: 'token_check',
          defaultUserExists: true,
          tokenFound: false,
          message: 'This is the expected behavior when no token exists'
        }
      });
    }

    // If we get here, we have a token - test it
    console.log('3️⃣ Testing token with CLIO API...');
    const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CLIO-API-VERSION': '4'
      },
    });

    console.log('- CLIO API response status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      return NextResponse.json({
        isConnected: true,
        debug: {
          step: 'api_success',
          user: responseData.data?.name || 'Unknown'
        }
      });
    } else {
      console.log('- CLIO API returned error, clearing token...');
      
      // Clear invalid token
      const defaultUser = await DatabaseService.getDefaultUser();
      if (defaultUser) {
        await DatabaseService.deleteClioToken(defaultUser.id);
      }
      
      return NextResponse.json({
        isConnected: false,
        error: 'Access token expired or invalid. Please reconnect to CLIO.',
        debug: {
          step: 'api_error',
          status: response.status,
          tokenCleared: true
        }
      });
    }

  } catch (error) {
    console.error('Status test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        step: 'exception',
        error: error
      }
    }, { status: 500 });
  }
}
