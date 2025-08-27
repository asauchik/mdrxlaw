import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Checking current database state...');
    
    // Get all users
    const users = await DatabaseService.getAllUsers();
    console.log('Users found:', users.length);
    
    // Get all tokens
    const tokens = await DatabaseService.getAllTokens();
    console.log('Tokens found:', tokens.length);
    
    // Get default user specifically
    const defaultUser = await DatabaseService.getDefaultUser();
    
    return NextResponse.json({
      database_state: {
        total_users: users.length,
        total_tokens: tokens.length,
        default_user_exists: !!defaultUser,
        default_user_id: defaultUser?.id || null
      },
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      })),
      tokens: tokens.map(token => ({
        id: token.id,
        user_id: token.user_id,
        token_type: token.token_type,
        has_access_token: !!token.access_token,
        has_refresh_token: !!token.refresh_token,
        expires_in: token.expires_in,
        scope: token.scope,
        created_at: token.created_at,
        updated_at: token.updated_at
      })),
      debug_info: {
        timestamp: new Date().toISOString(),
        message: 'Current database state for CLIO token investigation'
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking database state:', error);
    return NextResponse.json({
      error: 'Failed to check database state',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
