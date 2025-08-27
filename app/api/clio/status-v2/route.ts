import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({
        isConnected: false,
        error: 'Authorization required'
      }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        isConnected: false,
        error: 'Invalid authentication'
      }, { status: 401 });
    }

    // Get token from database
    const { data: clioToken, error: dbError } = await supabaseAdmin
      .from('clio_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (dbError || !clioToken) {
      return NextResponse.json({
        isConnected: false,
        error: 'No CLIO token found. Please connect.'
      });
    }

    // Test the token with CLIO API
    const testResponse = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
      headers: {
        'Authorization': `Bearer ${clioToken.access_token}`,
        'Content-Type': 'application/json',
        'X-CLIO-API-VERSION': '4'
      }
    });

    console.log('V2 Status check:', {
      status: testResponse.status,
      tokenPrefix: clioToken.access_token.substring(0, 8) + '...',
      hasRefreshToken: !!clioToken.refresh_token,
      scope: clioToken.scope
    });

    if (testResponse.ok) {
      const userData = await testResponse.json();
      return NextResponse.json({
        isConnected: true,
        version: 'v2',
        tokenInfo: {
          scope: clioToken.scope,
          expires_in: clioToken.expires_in,
          has_refresh_token: !!clioToken.refresh_token,
          created_at: clioToken.created_at
        },
        accountInfo: {
          name: userData.data?.name || 'Unknown User',
          email: userData.data?.email || 'Unknown Email'
        }
      });
    } else {
      const errorText = await testResponse.text();
      console.error('V2 CLIO API error:', testResponse.status, errorText);
      
      return NextResponse.json({
        isConnected: false,
        error: `CLIO API error: ${testResponse.status}`,
        details: errorText,
        version: 'v2'
      });
    }

  } catch (error) {
    console.error('V2 Status check error:', error);
    return NextResponse.json({
      isConnected: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
