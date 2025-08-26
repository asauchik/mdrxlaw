import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!serviceRoleKey,
      url: supabaseUrl?.substring(0, 30) + '...'
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          hasServiceKey: !!serviceRoleKey
        }
      });
    }
    
    // Test basic connection
    const { error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      });
    }
    
    console.log('✅ Database connection successful');
    
    // Check if default user exists
    const { data: defaultUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'default@mdrxlaw.com')
      .single();
    
    // Check if any tokens exist
    const { data: tokens } = await supabase
      .from('clio_tokens')
      .select('id, user_id, created_at, expires_in, token_type')
      .limit(5);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      details: {
        environment: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          hasServiceKey: !!serviceRoleKey
        },
        defaultUser: userError ? null : {
          id: defaultUser?.id,
          email: defaultUser?.email,
          created_at: defaultUser?.created_at
        },
        tokensCount: tokens?.length || 0,
        recentTokens: tokens?.map(t => ({
          id: t.id,
          user_id: t.user_id,
          created_at: t.created_at,
          expires_in: t.expires_in,
          token_type: t.token_type
        }))
      }
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
