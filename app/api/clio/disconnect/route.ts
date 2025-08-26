import { NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';

export async function POST() {
  try {
    // Try to get token from in-memory storage first
    let accessToken = tokenStorage.getValidAccessToken('default');
    
    if (!accessToken) {
      accessToken = process.env.CLIO_ACCESS_TOKEN || null;
    }

    if (accessToken) {
      try {
        // Revoke the token with CLIO using their API
        const revokeResponse = await fetch('https://app.clio.com/oauth/deauthorize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-CLIO-API-VERSION': '4'
          },
        });

        if (revokeResponse.ok) {
          console.log('✅ Access token revoked successfully with CLIO');
        } else {
          console.warn('⚠️ Failed to revoke token with CLIO:', revokeResponse.status);
          // Continue with local cleanup even if revocation fails
        }
      } catch (revokeError) {
        console.error('Failed to revoke token:', revokeError);
        // Continue with local cleanup even if revocation fails
      }
    }

    // Clear the token from in-memory storage
    tokenStorage.removeToken('default');

    // In production, you would:
    // 1. Remove the tokens from your database
    // 2. Clear user session data
    // 3. Invalidate any cached user information
    // 4. Log the disconnection event for security audit

    console.log('🔌 User disconnected from CLIO');

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from CLIO. You can reconnect at any time.'
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({
      error: 'Failed to disconnect from CLIO. Please try again.'
    }, { status: 500 });
  }
}
