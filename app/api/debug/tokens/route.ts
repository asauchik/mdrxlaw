import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Missing environment variables'
      });
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    // Get all tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('clio_tokens')
      .select('*');
    
    return NextResponse.json({
      success: true,
      users: users || [],
      tokens: tokens?.map(token => ({
        id: token.id,
        user_id: token.user_id,
        token_type: token.token_type,
        expires_in: token.expires_in,
        scope: token.scope,
        created_at: token.created_at,
        access_token_length: token.access_token?.length || 0
      })) || [],
      usersError: usersError?.message,
      tokensError: tokensError?.message
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
