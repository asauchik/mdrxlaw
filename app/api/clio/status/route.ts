import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get token from database
    const { data: tokenRow, error } = await supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tokenRow) {
      return NextResponse.json({ 
        isConnected: false, 
        error: 'No token found' 
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRow.expires_at);
    
    if (now >= expiresAt) {
      return NextResponse.json({ 
        isConnected: false, 
        error: 'Token expired',
        expires_at: tokenRow.expires_at
      });
    }

    // Test token with CLIO API - Using correct header and endpoint
    const testResponse = await fetch('https://app.clio.com/api/v4/users/who_am_i', {
      headers: {
        'Authorization': `Bearer ${tokenRow.access_token}`,
        'X-API-VERSION': '4.0.10'  // Correct header name and latest version
      }
    });

    console.log('CLIO API test result:', testResponse.status);

    if (testResponse.ok) {
      const userData = await testResponse.json();
      return NextResponse.json({
        isConnected: true,
        user: userData.data,
        accountInfo: {
          name: userData.data?.name || 'Unknown User',
          email: userData.data?.email || 'Unknown Email'
        },
        token_info: {
          scope: tokenRow.scope,
          expires_at: tokenRow.expires_at,
          has_refresh: !!tokenRow.refresh_token
        }
      });
    } else {
      const errorText = await testResponse.text();
      console.error('CLIO API error:', testResponse.status, errorText);
      
      let detailedError = `CLIO API returned ${testResponse.status}`;
      let troubleshooting = '';
      
      if (testResponse.status === 403) {
        detailedError = 'CLIO API returned 403 Forbidden - Access Denied';
        troubleshooting = `
Common causes of 403 errors:
• App not approved for production use in CLIO Developer Console
• Incorrect scopes (we're using: ${tokenRow.scope})
• App permissions not properly configured
• Wrong CLIO environment (production vs sandbox)
• Redirect URI mismatch in app settings

To resolve:
1. Check your CLIO Developer Console app settings
2. Verify app is approved for production use
3. Confirm redirect URI exactly matches: ${process.env.CLIO_REDIRECT_URI}
4. Contact CLIO support if permissions are unclear
        `;
      }
      
      return NextResponse.json({
        isConnected: false,
        error: detailedError,
        troubleshooting: troubleshooting.trim(),
        details: errorText,
        scope_used: tokenRow.scope,
        token_prefix: tokenRow.access_token.substring(0, 10) + '...'
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      isConnected: false, 
      error: 'Internal error' 
    }, { status: 500 });
  }
}
