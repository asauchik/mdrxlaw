import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({
        error: 'Authorization required'
      }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 });
    }

    // Try to get token from database first for revocation
    let accessToken = null;
    
    try {
      accessToken = await DatabaseService.getValidClioToken(user.id);
    } catch (dbError) {
      console.error('Database error getting token for revocation:', dbError);
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

    // Clear the token from database
    try {
      await DatabaseService.deleteClioToken(user.id);
      console.log('✅ Token cleared from database for user:', user.id);
    } catch (dbError) {
      console.error('Database error clearing token:', dbError);
      // Continue even if database cleanup fails
    }

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
