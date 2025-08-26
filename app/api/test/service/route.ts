import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('🔑 Testing with service role key...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!serviceRoleKey
        }
      });
    }
    
    // Use service role key which bypasses RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }
    
    // Try to get/create default user
    const { data: defaultUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'default@mdrxlaw.com')
      .single();
    
    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create it
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: 'default@mdrxlaw.com',
          name: 'Default User'
        }])
        .select()
        .single();
      
      if (createError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create default user',
          details: createError.message
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Database working! Default user created.',
        totalUsers: (data?.length || 0) + 1,
        defaultUser: newUser
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database working! Default user exists.',
      totalUsers: data?.length || 0,
      defaultUser: defaultUser
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Service test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
