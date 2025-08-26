import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // Handle authorization errors
    if (error) {
      const errorMsg = errorDescription || error;
      console.error('CLIO OAuth error:', errorMsg);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(errorMsg)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=No authorization code received', baseUrl)
      );
    }

    // In production, verify the state parameter for CSRF protection
    if (state) {
      console.log('Received OAuth state:', state);
      // TODO: Verify state matches what was stored in session
    } else {
      console.warn('No state parameter received in OAuth callback');
    }

    // Exchange code for access token
    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioClientSecret = process.env.CLIO_CLIENT_SECRET;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clioClientId || !clioClientSecret || !clioRedirectUri) {
      return NextResponse.redirect(
        new URL('/?error=CLIO configuration missing', baseUrl)
      );
    }

    console.log('Exchanging authorization code for access token...');

    const tokenResponse = await fetch('https://app.clio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clioClientId,
        client_secret: clioClientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: clioRedirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorData);
      return NextResponse.redirect(
        new URL('/?error=Token exchange failed', baseUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return NextResponse.redirect(
        new URL('/?error=No access token received', baseUrl)
      );
    }

    // In a production application, you would:
    // 1. Store the access_token and refresh_token securely in your database
    // 2. Associate them with the current user's session
    // 3. Set up automatic token refresh using the refresh_token
    // 4. Implement proper token storage with encryption

    console.log('✅ Access token received successfully');
    console.log('Token type:', tokenData.token_type);
    console.log('Expires in:', tokenData.expires_in, 'seconds');
    console.log('Scope:', tokenData.scope);
    
    // For development, log the token (NEVER do this in production!)
    if (process.env.NODE_ENV === 'development') {
      console.log('Access token (first 20 chars):', tokenData.access_token?.substring(0, 20) + '...');
      console.log('🔧 For development: Add this to your .env.local file:');
      console.log(`CLIO_ACCESS_TOKEN=${tokenData.access_token}`);
    }
    
    // Redirect back to the home page with success message
    return NextResponse.redirect(new URL('/?connected=true', baseUrl));

  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL('/?error=OAuth callback failed', baseUrl)
    );
  }
}
