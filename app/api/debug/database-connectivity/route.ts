import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Testing direct database connectivity...');
    
    const results: Record<string, unknown> = {};
    
    // Test 1: Check connection
    console.log('Test 1: Checking database connection...');
    try {
      const { data: connectionTest, error: connectionError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
      
      results.connectionTest = {
        success: !connectionError,
        error: connectionError?.message || null,
        data: connectionTest
      };
    } catch (error) {
      results.connectionTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 2: Check users table structure
    console.log('Test 2: Checking users table...');
    try {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(5);
      
      results.usersTable = {
        success: !usersError,
        error: usersError?.message || null,
        count: usersData?.length || 0,
        sample: usersData?.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at
        })) || []
      };
    } catch (error) {
      results.usersTable = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 3: Check clio_tokens table structure
    console.log('Test 3: Checking clio_tokens table...');
    try {
      const { data: tokensData, error: tokensError } = await supabaseAdmin
        .from('clio_tokens')
        .select('*')
        .limit(5);
      
      results.clioTokensTable = {
        success: !tokensError,
        error: tokensError?.message || null,
        count: tokensData?.length || 0,
        sample: tokensData?.map(token => ({
          id: token.id,
          user_id: token.user_id,
          token_type: token.token_type,
          has_access_token: !!token.access_token,
          created_at: token.created_at
        })) || []
      };
    } catch (error) {
      results.clioTokensTable = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 4: Test insert operation
    console.log('Test 4: Testing insert operation...');
    try {
      const testUser = {
        email: `test_${Date.now()}@test.com`,
        name: 'Test User'
      };
      
      const { data: insertedUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([testUser])
        .select()
        .single();
      
      if (!insertError && insertedUser) {
        // Try to insert a token for this user
        const testToken = {
          user_id: insertedUser.id,
          access_token: `test_token_${Date.now()}`,
          refresh_token: `test_refresh_${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'test'
        };
        
        const { data: insertedToken, error: tokenError } = await supabaseAdmin
          .from('clio_tokens')
          .insert([testToken])
          .select()
          .single();
        
        results.insertTest = {
          success: !tokenError,
          userInserted: !!insertedUser,
          tokenInserted: !!insertedToken,
          userError: insertError?.message || null,
          tokenError: tokenError?.message || null,
          testUserId: insertedUser.id,
          testTokenId: insertedToken?.id || null
        };
        
        // Cleanup test data
        await supabaseAdmin.from('clio_tokens').delete().eq('user_id', insertedUser.id);
        await supabaseAdmin.from('users').delete().eq('id', insertedUser.id);
        
      } else {
        results.insertTest = {
          success: false,
          userInserted: false,
          tokenInserted: false,
          userError: insertError?.message || 'Failed to insert user',
          tokenError: 'Could not test token insert due to user insert failure'
        };
      }
    } catch (error) {
      results.insertTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 5: Check environment variables
    console.log('Test 5: Checking environment variables...');
    results.environmentTest = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    };
    
    return NextResponse.json({
      success: true,
      message: 'Database connectivity test completed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database connectivity test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connectivity test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
