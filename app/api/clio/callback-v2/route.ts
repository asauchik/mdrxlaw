import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (error) {
      console.error('CLIO OAuth error:', errorDescription || error);
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, baseUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=Missing authorization code or state', baseUrl));
    }

    console.log('Processing V2 OAuth callback for user:', state);

    // Exchange code for access token
    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioClientSecret = process.env.CLIO_CLIENT_SECRET;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clioClientId || !clioClientSecret || !clioRedirectUri) {
      return NextResponse.redirect(new URL('/?error=CLIO configuration missing', baseUrl));
    }

    const tokenParams = new URLSearchParams({
      client_id: clioClientId,
      client_secret: clioClientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: clioRedirectUri,
    });

    const tokenResponse = await fetch('https://app.clio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorData);
      return NextResponse.redirect(new URL(`/?error=Token exchange failed`, baseUrl));
    }

    const tokenData = await tokenResponse.json();
    console.log('V2 Token response:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    });

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/?error=No access token received', baseUrl));
    }

    // Store using direct SQL via supabaseAdmin
    const { error: dbError } = await supabaseAdmin
      .from('clio_tokens')
      .upsert({
        user_id: state,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || 'bearer',
        expires_in: tokenData.expires_in || 2592000,
        scope: tokenData.scope || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(new URL('/?error=Database storage failed', baseUrl));
    }

    console.log('✅ V2 token stored successfully');
    return NextResponse.redirect(new URL('/?connected=v2', baseUrl));

  } catch (error) {
    console.error('V2 OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL('/?error=OAuth callback failed', baseUrl));
  }
}
