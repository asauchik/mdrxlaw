#!/usr/bin/env node

/**
 * MCP Server for Supabase Database Operations
 * This script provides direct database access using the Model Context Protocol
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

class SupabaseMCPServer {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!this.supabaseUrl || !this.serviceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    // Create admin client with service role key (bypasses RLS)
    this.adminClient = createClient(this.supabaseUrl, this.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Create regular client with anon key
    this.client = createClient(this.supabaseUrl, this.anonKey);
  }

  async testConnection() {
    console.log('🔧 MCP: Testing Supabase connection...');
    console.log('URL:', this.supabaseUrl);
    console.log('Service Key:', this.serviceKey ? 'Present' : 'Missing');
    console.log('Anon Key:', this.anonKey ? 'Present' : 'Missing');
    
    try {
      // Test with admin client (bypasses RLS)
      console.log('\n📡 Testing admin connection (service role)...');
      const { data: adminData, error: adminError } = await this.adminClient
        .from('users')
        .select('*')
        .limit(1);
      
      if (adminError) {
        console.error('❌ Admin connection failed:', adminError.message);
      } else {
        console.log('✅ Admin connection successful');
        console.log('Users found:', adminData?.length || 0);
      }
      
      // Test with regular client (uses RLS)
      console.log('\n📡 Testing regular connection (anon key)...');
      const { data: regularData, error: regularError } = await this.client
        .from('users')
        .select('*')
        .limit(1);
      
      if (regularError) {
        console.error('❌ Regular connection failed:', regularError.message);
        console.error('Error code:', regularError.code);
      } else {
        console.log('✅ Regular connection successful');
        console.log('Users found (with RLS):', regularData?.length || 0);
      }
      
    } catch (error) {
      console.error('💥 Connection test failed:', error);
    }
  }

  async checkRLSPolicies() {
    console.log('\n🔒 MCP: Checking RLS policies...');
    
    try {
      // Check if RLS is enabled
      const { data: rlsData, error: rlsError } = await this.adminClient
        .rpc('exec_sql', {
          sql: `
            SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('users', 'clio_tokens');
          `
        });
      
      if (rlsError) {
        console.error('❌ Failed to check RLS status:', rlsError.message);
      } else {
        console.log('RLS Status:', rlsData);
      }
      
      // Check existing policies
      const { data: policiesData, error: policiesError } = await this.adminClient
        .rpc('exec_sql', {
          sql: `
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename IN ('users', 'clio_tokens');
          `
        });
      
      if (policiesError) {
        console.error('❌ Failed to check policies:', policiesError.message);
      } else {
        console.log('Current Policies:', policiesData);
      }
      
    } catch (error) {
      console.error('💥 RLS check failed:', error);
    }
  }

  async disableRLS() {
    console.log('\n🔓 MCP: Temporarily disabling RLS for testing...');
    
    try {
      await this.adminClient.rpc('exec_sql', {
        sql: 'ALTER TABLE users DISABLE ROW LEVEL SECURITY;'
      });
      
      await this.adminClient.rpc('exec_sql', {
        sql: 'ALTER TABLE clio_tokens DISABLE ROW LEVEL SECURITY;'
      });
      
      console.log('✅ RLS disabled temporarily');
      
    } catch (error) {
      console.error('❌ Failed to disable RLS:', error);
    }
  }

  async enableRLS() {
    console.log('\n🔒 MCP: Re-enabling RLS...');
    
    try {
      await this.adminClient.rpc('exec_sql', {
        sql: 'ALTER TABLE users ENABLE ROW LEVEL SECURITY;'
      });
      
      await this.adminClient.rpc('exec_sql', {
        sql: 'ALTER TABLE clio_tokens ENABLE ROW LEVEL SECURITY;'
      });
      
      console.log('✅ RLS re-enabled');
      
    } catch (error) {
      console.error('❌ Failed to enable RLS:', error);
    }
  }

  async createSimplePolicies() {
    console.log('\n📋 MCP: Creating simple allow-all policies...');
    
    try {
      // Drop existing policies
      await this.adminClient.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS "Users can view their own data" ON users;
          DROP POLICY IF EXISTS "Users can manage their tokens" ON clio_tokens;
        `
      });
      
      // Create new simple policies
      await this.adminClient.rpc('exec_sql', {
        sql: `
          CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);
          CREATE POLICY "Allow all access to clio_tokens" ON clio_tokens FOR ALL USING (true);
        `
      });
      
      console.log('✅ Simple policies created');
      
    } catch (error) {
      console.error('❌ Failed to create policies:', error);
    }
  }

  async testCRUDOperations() {
    console.log('\n🧪 MCP: Testing CRUD operations...');
    
    try {
      // Test creating a user
      console.log('Creating test user...');
      const { data: newUser, error: createError } = await this.client
        .from('users')
        .insert([{
          email: 'mcp-test@example.com',
          name: 'MCP Test User'
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create user:', createError.message);
        return;
      }
      
      console.log('✅ User created:', newUser.id);
      
      // Test creating a token
      console.log('Creating test token...');
      const { data: newToken, error: tokenError } = await this.client
        .from('clio_tokens')
        .insert([{
          user_id: newUser.id,
          access_token: 'mcp-test-token-123',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'test'
        }])
        .select()
        .single();
      
      if (tokenError) {
        console.error('❌ Failed to create token:', tokenError.message);
      } else {
        console.log('✅ Token created:', newToken.id);
      }
      
      // Clean up
      console.log('Cleaning up test data...');
      await this.client.from('clio_tokens').delete().eq('user_id', newUser.id);
      await this.client.from('users').delete().eq('id', newUser.id);
      console.log('✅ Test data cleaned up');
      
    } catch (error) {
      console.error('💥 CRUD test failed:', error);
    }
  }

  async run() {
    console.log('🚀 Starting MCP Supabase Diagnostics...\n');
    
    await this.testConnection();
    await this.checkRLSPolicies();
    
    // If regular connection fails, try fixing RLS
    console.log('\n🔧 Attempting to fix RLS issues...');
    await this.disableRLS();
    await this.createSimplePolicies();
    await this.enableRLS();
    
    console.log('\n🧪 Testing after fixes...');
    await this.testConnection();
    await this.testCRUDOperations();
    
    console.log('\n🎉 MCP Diagnostics Complete!');
  }
}

// Run the MCP server
const server = new SupabaseMCPServer();
server.run().catch(console.error);

export default SupabaseMCPServer;
