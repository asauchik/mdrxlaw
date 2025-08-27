import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get user email from query parameters
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({
        isConnected: false,
        error: 'User email is required'
      });
    }

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

    // Check for stored access token for this user
    let accessToken = null;
    console.log('🗄️ Checking database for token for user:', userEmail);
    
    try {
      // Get or create user by email
      let user = await DatabaseService.getUserByEmail(userEmail);
      if (!user) {
        // Create user if they don't exist
        user = await DatabaseService.createUser(userEmail);
        if (!user) {
          return NextResponse.json({
            isConnected: false,
            error: 'Failed to create user record'
          });
        }
      }
      
      console.log('👤 Found/created user:', user.id);
      accessToken = await DatabaseService.getValidClioToken(user.id);
      console.log('🔍 Database token check:', accessToken ? 'Found' : 'Not found');
    } catch (dbError) {
      console.error('Database error getting token:', dbError);
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
        
        // Clear the invalid token from database
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
