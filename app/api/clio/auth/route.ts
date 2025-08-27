import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Simple OAuth URL with just basic read scope
    const authUrl = new URL('https://app.clio.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.CLIO_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.CLIO_REDIRECT_URI!);
    authUrl.searchParams.set('state', user_id);
    authUrl.searchParams.set('scope', 'read:user_profile'); // Minimal scope

    console.log('CLIO Auth URL:', authUrl.toString());

    return NextResponse.json({ 
      url: authUrl.toString(),
      message: 'Redirect to CLIO for authorization'
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Failed to create auth URL' }, { status: 500 });
  }
}
