import { NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    console.log('=== SIMPLE TOKEN TEST ===');
    
    // 1. Check in-memory storage
    const memoryToken = tokenStorage.getValidAccessToken('default');
    console.log('🧠 Memory token:', memoryToken ? 'EXISTS' : 'MISSING');
    
    // 2. Check database storage  
    const defaultUser = await DatabaseService.getDefaultUser();
    console.log('👤 Default user:', defaultUser ? `EXISTS (${defaultUser.id})` : 'MISSING');
    
    let dbToken = null;
    if (defaultUser) {
      dbToken = await DatabaseService.getValidClioToken(defaultUser.id);
      console.log('🗄️ Database token:', dbToken ? 'EXISTS' : 'MISSING');
      
      // Get raw token data to check expiration logic
      const rawToken = await DatabaseService.getClioToken(defaultUser.id);
      if (rawToken) {
        const now = Date.now();
        const createdAt = new Date(rawToken.created_at).getTime();
        const expiresAt = createdAt + (rawToken.expires_in * 1000);
        const timeToExpiry = expiresAt - now;
        
        console.log('⏰ Token timing:', {
          created: new Date(rawToken.created_at).toISOString(),
          expiresIn: rawToken.expires_in,
          timeToExpiry: Math.floor(timeToExpiry / 1000 / 60), // minutes
          isExpired: timeToExpiry <= 0
        });
      }
    }
    
    // 3. Check environment variable
    const envToken = process.env.CLIO_ACCESS_TOKEN;
    console.log('🌍 Environment token:', envToken ? 'EXISTS' : 'MISSING');
    
    // 4. Test memory storage manually
    const testToken = {
      access_token: 'test_token_' + Date.now(),
      expires_in: 604800, // 7 days
      token_type: 'Bearer',
      scope: 'test',
      created_at: Date.now()
    };
    
    tokenStorage.storeToken('test', testToken);
    const retrievedToken = tokenStorage.getValidAccessToken('test');
    console.log('🧪 Memory test:', retrievedToken === testToken.access_token ? 'PASS' : 'FAIL');
    
    // Clean up test
    tokenStorage.removeToken('test');
    
    return NextResponse.json({
      status: 'Test completed',
      results: {
        memoryToken: !!memoryToken,
        dbToken: !!dbToken,
        envToken: !!envToken,
        defaultUser: !!defaultUser,
        memoryTest: retrievedToken === testToken.access_token
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
