import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({
        isConnected: false,
        error: 'Authorization required'
      }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        isConnected: false,
        error: 'Invalid authentication'
      }, { status: 401 });
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
    console.log('🗄️ Checking database for token for user:', user.id);
    
    try {
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
        // Try refresh once
        try {
          const refreshed = await DatabaseService.refreshClioToken(user.id);
          if (refreshed) {
            console.log('🔄 Retrying CLIO who_am_i after refresh');
            const retry = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
              headers: {
                'Authorization': `Bearer ${refreshed.access_token}`,
                'Content-Type': 'application/json',
                'X-CLIO-API-VERSION': '4'
              },
            });
            if (retry.ok) {
              const retryData = await retry.json();
              const u = retryData.data;
              return NextResponse.json({
                isConnected: true,
                lastSync: new Date().toISOString(),
                accountInfo: {
                  name: u?.name || 'Unknown User',
                  email: u?.email || 'Unknown Email'
                },
                refreshed: true
              });
            }
            console.error('Retry after refresh failed:', retry.status);
          } else {
            console.warn('Refresh attempt failed or not possible');
          }
        } catch (refreshErr) {
          console.error('Refresh process error:', refreshErr);
        }
        return NextResponse.json({
          isConnected: false,
          error: 'CLIO token rejected after refresh attempt. Please reconnect.',
          needsReauth: true
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
