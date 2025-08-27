import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { user_id, scope_test } = await request.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Test different scope formats for CLIO
    const scopeOptions = {
      'minimal': 'read:user_profile',
      'basic_users': 'read:users',
      'profile_only': 'profile',
      'user_info': 'user_info',
      'openid': 'openid profile',
      'empty': ''
    };

    const scope = scopeOptions[scope_test as keyof typeof scopeOptions] || scopeOptions.minimal;

    // Generate OAuth URL with specified scope
    const authUrl = new URL('https://app.clio.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.CLIO_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.CLIO_REDIRECT_URI!);
    authUrl.searchParams.set('state', `${user_id}::${scope_test}`); // Include scope test in state
    authUrl.searchParams.set('scope', scope);

    console.log(`Testing CLIO scope: ${scope_test} = "${scope}"`);

    return NextResponse.json({ 
      url: authUrl.toString(),
      scope_being_tested: scope,
      test_name: scope_test,
      message: `Testing scope: ${scope}`
    });

  } catch (error) {
    console.error('Scope test error:', error);
    return NextResponse.json({ error: 'Failed to create test auth URL' }, { status: 500 });
  }
}
