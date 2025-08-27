import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({
        error: 'Authorization required'
      }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 });
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
    
    // Add user ID as state parameter to track which user is authenticating
    // This serves both as CSRF protection and user identification
    authUrl.searchParams.append('state', user.id);
    
    // Debug logging
    console.log('=== CLIO OAuth Debug ===');
    console.log('Client ID:', clioClientId);
    console.log('Redirect URI:', clioRedirectUri);
    console.log('User ID (state):', user.id);
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

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state: user.id,
      message: 'Redirecting to CLIO for authorization...'
    });

  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json({
      error: 'Failed to generate authorization URL'
    }, { status: 500 });
  }
}
