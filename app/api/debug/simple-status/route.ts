import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple token check - try each source independently
    console.log('=== SIMPLIFIED STATUS CHECK ===');
    
    // Check environment first (this is immediate)
    const envToken = process.env.CLIO_ACCESS_TOKEN;
    console.log('Environment token:', envToken ? 'Present' : 'Empty');
    
    if (envToken && envToken.trim()) {
      // Test env token directly
      const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
        headers: {
          'Authorization': `Bearer ${envToken}`,
          'Content-Type': 'application/json',
          'X-CLIO-API-VERSION': '4'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          isConnected: true,
          source: 'environment',
          user: data.data?.name || 'Unknown'
        });
      } else {
        console.log('Environment token invalid, status:', response.status);
      }
    }
    
    return NextResponse.json({
      isConnected: false,
      source: 'none',
      message: 'No valid tokens found. Environment token is empty or invalid.'
    });
    
  } catch (error) {
    console.error('Simple status error:', error);
    return NextResponse.json({
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
