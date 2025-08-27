import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clioClientId || !clioRedirectUri) {
      return NextResponse.json({
        error: 'CLIO environment variables not configured'
      }, { status: 500 });
    }

    // MINIMAL scopes that should work - just basic profile access
    const basicScopes = 'read:user_profile offline_access';
    
    // Generate CLIO OAuth URL
    const authUrl = new URL('https://app.clio.com/oauth/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clioClientId);
    authUrl.searchParams.append('redirect_uri', clioRedirectUri);
    authUrl.searchParams.append('state', user.id);
    authUrl.searchParams.append('scope', basicScopes);
    
    console.log('=== CLIO OAuth V2 ===');
    console.log('Using minimal scopes:', basicScopes);
    console.log('Auth URL:', authUrl.toString());
    console.log('====================');

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state: user.id,
      scopes: basicScopes,
      message: 'Redirecting to CLIO with minimal scopes...'
    });

  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json({
      error: 'Failed to generate authorization URL'
    }, { status: 500 });
  }
}
