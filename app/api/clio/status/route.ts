import { NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    // Check for CLIO environment variables
    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioClientSecret = process.env.CLIO_CLIENT_SECRET;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clioClientId || !clioClientSecret || !clioRedirectUri) {
      return NextResponse.json({
        isConnected: false,
        error: 'CLIO environment variables not configured. Please check your .env.local file.'
      });
    }

    // Check for stored access token (try in-memory, then database, then environment)
    let accessToken = tokenStorage.getValidAccessToken('default');
    console.log('🔍 In-memory token check:', accessToken ? 'Found' : 'Not found');
    
    if (!accessToken) {
      // Try database storage
      try {
        console.log('🗄️ Checking database for token...');
        const defaultUser = await DatabaseService.getDefaultUser();
        if (defaultUser) {
          console.log('👤 Found default user:', defaultUser.id);
          accessToken = await DatabaseService.getValidClioToken(defaultUser.id);
          console.log('🔍 Database token check:', accessToken ? 'Found' : 'Not found');
          
          // If we found a valid token in database, also store it in memory for faster access
          if (accessToken) {
            const dbToken = await DatabaseService.getClioToken(defaultUser.id);
            if (dbToken) {
              console.log('💾 Loading token into memory cache');
              tokenStorage.storeToken('default', {
                access_token: dbToken.access_token,
                refresh_token: dbToken.refresh_token || undefined,
                expires_in: dbToken.expires_in,
                token_type: dbToken.token_type,
                scope: dbToken.scope,
                created_at: new Date(dbToken.created_at).getTime()
              });
            }
          }
        } else {
          console.log('❌ No default user found in database');
        }
      } catch (dbError) {
        console.error('Database error getting token:', dbError);
      }
    }
    
    if (!accessToken) {
      console.log('🔍 Checking environment variable for token...');
      accessToken = process.env.CLIO_ACCESS_TOKEN || null;
      console.log('🔍 Environment token check:', accessToken ? 'Found' : 'Not found');
    }
    
    if (!accessToken) {
      return NextResponse.json({
        isConnected: false,
        error: 'No access token found. Please connect to CLIO.'
      });
    }

    // Test the connection by making a request to CLIO API v4
    try {
      console.log('Testing CLIO connection with token:', accessToken?.substring(0, 10) + '...');
      
      const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CLIO-API-VERSION': '4'
        },
      });

      console.log('CLIO API response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        const userData = responseData.data;
        
        return NextResponse.json({
          isConnected: true,
          lastSync: new Date().toISOString(),
          accountInfo: {
            name: userData?.name || 'Unknown User',
            email: userData?.email || 'Unknown Email',
          }
        });
      } else if (response.status === 401 || response.status === 403) {
        console.error('CLIO API authentication error:', response.status);
        // Clear the invalid token from storage
        tokenStorage.removeToken('default');
        
        return NextResponse.json({
          isConnected: false,
          error: 'Access token expired or invalid. Please reconnect to CLIO.'
        });
      } else {
        const errorData = await response.text();
        console.error('CLIO API error:', response.status, errorData);
        return NextResponse.json({
          isConnected: false,
          error: `CLIO API returned error ${response.status}`
        });
      }
    } catch (apiError) {
      console.error('CLIO API network error:', apiError);
      return NextResponse.json({
        isConnected: false,
        error: 'Failed to connect to CLIO API. Please check your internet connection.'
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      isConnected: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
