import { NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';

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

    // Check for stored access token (first try in-memory storage, then environment)
    let accessToken = tokenStorage.getValidAccessToken('default');
    
    if (!accessToken) {
      accessToken = process.env.CLIO_ACCESS_TOKEN || null;
    }
    
    if (!accessToken) {
      return NextResponse.json({
        isConnected: false,
        error: 'No access token found. Please connect to CLIO.'
      });
    }

    // Test the connection by making a request to CLIO API v4
    try {
      const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CLIO-API-VERSION': '4'
        },
      });

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
      } else if (response.status === 401) {
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
