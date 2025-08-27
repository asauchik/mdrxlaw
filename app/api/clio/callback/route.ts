import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL('/?error=oauth_failed', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=missing_params', request.url));
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://app.clio.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CLIO_CLIENT_ID!,
        client_secret: process.env.CLIO_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.CLIO_REDIRECT_URI!
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenResponse.json();
    console.log('Token response:', { 
      has_access: !!tokens.access_token,
      has_refresh: !!tokens.refresh_token,
      expires_in: tokens.expires_in 
    });

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Store token
    const { error: dbError } = await supabase
      .from('clio_tokens')
      .upsert({
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope || 'read:user_profile'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(new URL('/?error=storage_failed', request.url));
    }

    console.log('✅ CLIO token stored successfully');
    return NextResponse.redirect(new URL('/?clio=connected', request.url));

  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_failed', request.url));
  }
}
