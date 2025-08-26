#!/usr/bin/env node

// Simplified MCP Diagnostic for CLIO Token Issues

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  console.log('🔍 MCP Diagnostic: CLIO Token Investigation');
  console.log('==========================================');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Environment Check:');
  console.log('- Supabase URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
  console.log('- Service Key:', serviceKey ? '✅ Present' : '❌ Missing');
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🔗 Database Connection Test:');
  
  try {
    // Test 1: Check if we can query users table
    console.log('\n1️⃣ Testing users table access...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users table access failed:', usersError);
      return;
    }
    
    console.log('✅ Users table accessible');
    console.log('- Users found:', users?.length || 0);
    users?.forEach(user => {
      console.log(`  * ${user.email} (${user.id})`);
    });

    // Test 2: Check if we can query tokens table
    console.log('\n2️⃣ Testing clio_tokens table access...');
    
    const { data: tokens, error: tokensError } = await supabase
      .from('clio_tokens')
      .select('id, user_id, token_type, expires_in, created_at')
      .limit(5);
    
    if (tokensError) {
      console.error('❌ Tokens table access failed:', tokensError);
      return;
    }
    
    console.log('✅ Tokens table accessible');
    console.log('- Tokens found:', tokens?.length || 0);
    tokens?.forEach(token => {
      const created = new Date(token.created_at);
      const expiresAt = new Date(created.getTime() + (token.expires_in * 1000));
      const isExpired = Date.now() > expiresAt.getTime();
      console.log(`  * Token ${token.id} for user ${token.user_id}: ${isExpired ? 'EXPIRED' : 'VALID'}`);
    });

    // Test 3: Get/Create default user
    console.log('\n3️⃣ Testing default user operations...');
    
    let { data: defaultUser, error: userError } = await supabase
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
        defaultUser = newUser;
        console.log('✅ Default user created:', defaultUser.id);
      }
    } else if (userError) {
      console.error('❌ User query failed:', userError);
      return;
    } else {
      console.log('✅ Default user found:', defaultUser.id);
    }

    // Test 4: Check default user's tokens
    console.log('\n4️⃣ Checking default user tokens...');
    
    const { data: userTokens, error: userTokensError } = await supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', defaultUser.id);
    
    if (userTokensError) {
      console.error('❌ User tokens query failed:', userTokensError);
      return;
    }
    
    console.log('- Tokens for default user:', userTokens?.length || 0);
    userTokens?.forEach((token, i) => {
      const created = new Date(token.created_at);
      const expiresAt = new Date(created.getTime() + (token.expires_in * 1000));
      const isExpired = Date.now() > expiresAt.getTime();
      console.log(`  Token ${i + 1}: ${token.access_token.substring(0, 20)}... - ${isExpired ? 'EXPIRED' : 'VALID'}`);
    });

    // Test 5: Test token operations
    console.log('\n5️⃣ Testing token storage and retrieval...');
    
    // Store a test token
    const testTokenData = {
      user_id: defaultUser.id,
      access_token: `test_token_${Date.now()}`,
      refresh_token: 'test_refresh',
      token_type: 'Bearer',
      expires_in: 604800,
      scope: 'test:scope'
    };
    
    const { data: storedToken, error: storeError } = await supabase
      .from('clio_tokens')
      .insert([testTokenData])
      .select()
      .single();
    
    if (storeError) {
      console.error('❌ Token storage failed:', storeError);
      return;
    }
    
    console.log('✅ Test token stored:', storedToken.id);

    // Retrieve the token
    const { data: retrievedTokens, error: retrieveError } = await supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', defaultUser.id)
      .order('created_at', { ascending: false });
    
    if (retrieveError) {
      console.error('❌ Token retrieval failed:', retrieveError);
      return;
    }
    
    console.log('✅ Tokens retrieved:', retrievedTokens?.length || 0);

    // Clean up test token
    await supabase.from('clio_tokens').delete().eq('id', storedToken.id);
    console.log('✅ Test token cleaned up');

    console.log('\n🎉 Database operations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Database connection: ✅ Working');
    console.log('- User operations: ✅ Working');  
    console.log('- Token operations: ✅ Working');
    console.log('- Default user ID:', defaultUser.id);
    
    if (userTokens?.length > 0) {
      console.log('\n⚠️ Found existing tokens for default user');
      console.log('This means tokens are being stored but not retrieved correctly by the API.');
      console.log('Issue is likely in the API route logic, not the database.');
    } else {
      console.log('\n✅ No existing tokens found');
      console.log('Database is clean and ready for new token storage.');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

main().catch(console.error);
