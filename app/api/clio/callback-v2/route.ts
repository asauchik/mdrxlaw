import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // Handle authorization errors
    if (error) {
      const errorMsg = errorDescription || error;
      console.error('CLIO OAuth error:', errorMsg);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(errorMsg)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=No authorization code received', baseUrl)
      );
    }

    // Exchange code for access token
    const clioClientId = process.env.CLIO_CLIENT_ID;
    const clioClientSecret = process.env.CLIO_CLIENT_SECRET;
    const clioRedirectUri = process.env.CLIO_REDIRECT_URI;

    if (!clioClientId || !clioClientSecret || !clioRedirectUri) {
      return NextResponse.redirect(
        new URL('/?error=CLIO configuration missing', baseUrl)
      );
    }

    console.log('🔄 Exchanging authorization code for access token...');

    // CLIO expects form-encoded data
    const tokenParams = new URLSearchParams({
      client_id: clioClientId,
      client_secret: clioClientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: clioRedirectUri,
    });

    const tokenResponse = await fetch('https://app.clio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Token exchange failed:', tokenResponse.status, errorData);
      return NextResponse.redirect(
        new URL(`/?error=Token exchange failed: ${tokenResponse.status}`, baseUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    
    console.log('✅ Token received from CLIO:', {
      access_token: tokenData.access_token ? 'Present' : 'Missing',
      refresh_token: tokenData.refresh_token ? 'Present' : 'Missing',
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope
    });
    
    if (!tokenData.access_token) {
      console.error('❌ No access token in response');
      return NextResponse.redirect(
        new URL('/?error=No access token received', baseUrl)
      );
    }

    // ONLY store in database - skip in-memory storage for serverless
    console.log('🗄️ Storing token in database only...');
    
    try {
      const defaultUser = await DatabaseService.getDefaultUser();
      if (!defaultUser) {
        console.error('❌ Could not get/create default user');
        return NextResponse.redirect(
          new URL('/?error=User setup failed', baseUrl)
        );
      }

      console.log('👤 Using default user:', defaultUser.id);
      
      const expiresIn = tokenData.expires_in || 604800; // 7 days default
      const storedToken = await DatabaseService.storeClioToken(
        defaultUser.id,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.token_type || 'Bearer',
        expiresIn,
        tokenData.scope || ''
      );
      
      if (!storedToken) {
        console.error('❌ Failed to store token in database');
        return NextResponse.redirect(
          new URL('/?error=Token storage failed', baseUrl)
        );
      }

      console.log('✅ Token stored successfully in database:', storedToken.id);
      
      // Verify by immediately retrieving it
      const verifyToken = await DatabaseService.getValidClioToken(defaultUser.id);
      if (verifyToken) {
        console.log('✅ Token verified in database');
      } else {
        console.error('❌ Token verification failed');
      }
      
    } catch (dbError) {
      console.error('❌ Database storage error:', dbError);
      return NextResponse.redirect(
        new URL('/?error=Database error', baseUrl)
      );
    }

    console.log('🎉 OAuth flow completed successfully');
    return NextResponse.redirect(new URL('/?connected=true', baseUrl));

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL('/?error=OAuth callback failed', baseUrl)
    );
  }
}
