import { NextResponse } from 'next/server';
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

    console.log('🔍 Starting token search (database-first approach)...');
    
    // SKIP in-memory check entirely - it doesn't work in serverless
    let accessToken = null;
    
    // Check database storage FIRST (most reliable in serverless)
    try {
      const defaultUser = await DatabaseService.getDefaultUser();
      if (defaultUser) {
        console.log('👤 Found default user:', defaultUser.id);
        accessToken = await DatabaseService.getValidClioToken(defaultUser.id);
        console.log('🔍 Database token check:', accessToken ? 'Found valid token' : 'No valid token');
      } else {
        console.log('❌ No default user found in database');
      }
    } catch (dbError) {
      console.error('Database error getting token:', dbError);
    }
    
    // Only if database has no token, check environment as fallback
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
        
        // Clear invalid token from database if it came from there
        try {
          const defaultUser = await DatabaseService.getDefaultUser();
          if (defaultUser) {
            await DatabaseService.deleteClioToken(defaultUser.id);
            console.log('🗑️ Cleared invalid token from database');
          }
        } catch (clearError) {
          console.error('Error clearing invalid token:', clearError);
        }
        
        return NextResponse.json({
          isConnected: false,
          error: 'Access token expired or invalid. Please reconnect to CLIO.'
        });
      } else {
        const errorData = await response.text();
        console.error('CLIO API error:', response.status, errorData);
        return NextResponse.json({
          isConnected: false,
          error: 'Failed to connect to CLIO API. Please try again.'
        });
      }

    } catch (apiError) {
      console.error('Error testing CLIO connection:', apiError);
      return NextResponse.json({
        isConnected: false,
        error: 'Network error connecting to CLIO. Please check your connection.'
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      isConnected: false,
      error: 'Internal error checking CLIO status. Please try again.'
    }, { status: 500 });
  }
}
