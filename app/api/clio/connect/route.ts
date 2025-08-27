import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get user email from request body
    const body = await request.json();
    const userEmail = body.userEmail;
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'User email is required'
      }, { status: 400 });
    }

    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clioClientId || !clioRedirectUri) {
      return NextResponse.json({
        error: 'CLIO environment variables not configured. Please check your .env.local file.'
      }, { status: 500 });
    }

    // Generate CLIO OAuth URL according to their documentation
    const authUrl = new URL('https://app.clio.com/oauth/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clioClientId);
    authUrl.searchParams.append('redirect_uri', clioRedirectUri);
    
    // Add user email as state parameter to track which user is authenticating
    authUrl.searchParams.append('state', userEmail);
    
    // Debug logging
    console.log('=== CLIO OAuth Debug ===');
    console.log('Client ID:', clioClientId);
    console.log('Redirect URI:', clioRedirectUri);
    console.log('User Email:', userEmail);
    console.log('Full OAuth URL:', authUrl.toString());
    console.log('========================');
    
    // Request comprehensive scopes for legal practice management
    const scopes = [
      'read:user_profile',
      'read:contacts',
      'read:matters',
      'read:documents',
      'read:activities',
      'read:calendar_entries',
      'read:communications',
      'read:custom_fields'
    ].join(' ');
    
    authUrl.searchParams.append('scope', scopes);
    
    // Generate secure state parameter for CSRF protection
    const state = randomBytes(32).toString('hex');
    authUrl.searchParams.append('state', state);

    // In production, you would store the state parameter securely
    // associated with the user session to verify on callback
    console.log('Generated OAuth state:', state);

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
      message: 'Redirecting to CLIO for authorization...'
    });

  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json({
      error: 'Failed to generate authorization URL'
    }, { status: 500 });
  }
}
