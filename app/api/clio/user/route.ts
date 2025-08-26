import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    // Try to get token from database only
    let accessToken = null;
    
    try {
      const defaultUser = await DatabaseService.getDefaultUser();
      if (defaultUser) {
        accessToken = await DatabaseService.getValidClioToken(defaultUser.id);
      }
    } catch (dbError) {
      console.error('Database error getting token:', dbError);
    }

    if (!accessToken) {
      return NextResponse.json({
        error: 'No access token found. Please connect to CLIO first.'
      }, { status: 401 });
    }

    // Fetch user profile from CLIO API
    const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CLIO-API-VERSION': '4'
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({
          error: 'Access token expired or invalid. Please reconnect to CLIO.'
        }, { status: 401 });
      }
      
      const errorData = await response.text();
      console.error('CLIO API error:', response.status, errorData);
      return NextResponse.json({
        error: `CLIO API returned error ${response.status}`
      }, { status: response.status });
    }

    const userData = await response.json();
    
    // Return formatted user data
    return NextResponse.json({
      user: userData.data,
      lastFetched: new Date().toISOString()
    });

  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch user data from CLIO'
    }, { status: 500 });
  }
}
