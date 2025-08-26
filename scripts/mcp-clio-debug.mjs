#!/usr/bin/env node

// MCP Diagnostic Script for CLIO Token Issues
// This script will directly connect to Supabase and diagnose the token storage problem

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  console.log('🔍 MCP Diagnostic: CLIO Token Investigation');
  console.log('==========================================');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Environment Check:');
  console.log('- Supabase URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
  console.log('- Service Key:', serviceKey ? '✅ Present' : '❌ Missing');
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing required environment variables');
    return;
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🔗 Database Connection Test:');
  
  try {
    // Test 1: Check if tables exist
    console.log('\n1️⃣ Checking table structure...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'clio_tokens']);
    
    if (tablesError) {
      console.error('❌ Table check failed:', tablesError);
      return;
    }
    
    const tableNames = tables?.map(t => t.table_name) || [];
    console.log('- Users table:', tableNames.includes('users') ? '✅ Exists' : '❌ Missing');
    console.log('- Tokens table:', tableNames.includes('clio_tokens') ? '✅ Exists' : '❌ Missing');

    // Test 2: Check RLS policies
    console.log('\n2️⃣ Checking RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
      .in('tablename', ['users', 'clio_tokens']);
    
    if (policiesError) {
      console.log('⚠️ Could not check RLS policies:', policiesError.message);
    } else {
      console.log('- RLS Policies found:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  * ${policy.tablename}.${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
      });
    }

    // Test 3: Try to get/create default user
    console.log('\n3️⃣ Testing user operations...');
    
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'default@mdrxlaw.com')
      .single();
    
    if (userError && userError.code === 'PGRST116') {
      console.log('- Default user not found, creating...');
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ 
          email: 'default@mdrxlaw.com', 
          name: 'Default User' 
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ User creation failed:', createError);
        return;
      } else {
        user = newUser;
        console.log('✅ Default user created:', user.id);
      }
    } else if (userError) {
      console.error('❌ User query failed:', userError);
      return;
    } else {
      console.log('✅ Default user found:', user.id);
    }

    // Test 4: Try token operations
    console.log('\n4️⃣ Testing token operations...');
    
    // Check existing tokens
    const { data: existingTokens, error: tokenError } = await supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', user.id);
    
    if (tokenError) {
      console.error('❌ Token query failed:', tokenError);
      return;
    }
    
    console.log('- Existing tokens:', existingTokens?.length || 0);
    existingTokens?.forEach((token, i) => {
      const created = new Date(token.created_at);
      const expiresAt = new Date(created.getTime() + (token.expires_in * 1000));
      const isExpired = Date.now() > expiresAt.getTime();
      console.log(`  Token ${i + 1}: Created ${created.toISOString()}, Expires ${expiresAt.toISOString()}, ${isExpired ? 'EXPIRED' : 'VALID'}`);
    });

    // Test token storage
    console.log('\n- Testing token storage...');
    const testToken = {
      user_id: user.id,
      access_token: `test_token_${Date.now()}`,
      refresh_token: 'test_refresh',
      token_type: 'Bearer',
      expires_in: 604800,
      scope: 'test:scope'
    };
    
    const { data: storedToken, error: storeError } = await supabase
      .from('clio_tokens')
      .insert([testToken])
      .select()
      .single();
    
    if (storeError) {
      console.error('❌ Token storage failed:', storeError);
      return;
    } else {
      console.log('✅ Token stored successfully:', storedToken.id);
    }

    // Test token retrieval
    const { data: retrievedToken, error: retrieveError } = await supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', storedToken.id)
      .single();
    
    if (retrieveError) {
      console.error('❌ Token retrieval failed:', retrieveError);
    } else {
      console.log('✅ Token retrieved successfully');
    }

    // Clean up test token
    const { error: deleteError } = await supabase
      .from('clio_tokens')
      .delete()
      .eq('id', storedToken.id);
    
    if (deleteError) {
      console.error('❌ Token cleanup failed:', deleteError);
    } else {
      console.log('✅ Test token cleaned up');
    }

    console.log('\n🎉 All database operations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Database connection: ✅ Working');
    console.log('- User operations: ✅ Working');  
    console.log('- Token operations: ✅ Working');
    console.log('\nThe database is functioning correctly. Issue may be in the API routes or OAuth flow.');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

main().catch(console.error);
