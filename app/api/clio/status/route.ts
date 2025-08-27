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
        connected: false, 
        error: 'No token found' 
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRow.expires_at);
    
    if (now >= expiresAt) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Token expired',
        expires_at: tokenRow.expires_at
      });
    }

    // Test token with CLIO API
    const testResponse = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
      headers: {
        'Authorization': `Bearer ${tokenRow.access_token}`,
        'X-CLIO-API-VERSION': '4'
      }
    });

    console.log('CLIO API test result:', testResponse.status);

    if (testResponse.ok) {
      const userData = await testResponse.json();
      return NextResponse.json({
        connected: true,
        user: userData.data,
        token_info: {
          scope: tokenRow.scope,
          expires_at: tokenRow.expires_at,
          has_refresh: !!tokenRow.refresh_token
        }
      });
    } else {
      const errorText = await testResponse.text();
      console.error('CLIO API error:', testResponse.status, errorText);
      
      return NextResponse.json({
        connected: false,
        error: `CLIO API returned ${testResponse.status}`,
        details: errorText
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      connected: false, 
      error: 'Internal error' 
    }, { status: 500 });
  }
}
