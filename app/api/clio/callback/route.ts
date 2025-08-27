import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the user ID
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

    // Get user ID from state parameter
    const userId = state;
    if (!userId) {
      console.error('No user ID in state parameter');
      return NextResponse.redirect(
        new URL('/?error=User authentication error', baseUrl)
      );
    }

    console.log('Processing OAuth callback for user:', userId);

    // Verify that this user ID exists in the auth.users table
    try {
      const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError || !authUser.user) {
        console.error('❌ Invalid user ID in OAuth state:', userId, userError);
        return NextResponse.redirect(
          new URL('/?error=Invalid user authentication', baseUrl)
        );
      }
      console.log('✅ Verified user exists:', authUser.user.email);
    } catch (userVerifyError) {
      console.error('❌ Failed to verify user:', userVerifyError);
      return NextResponse.redirect(
        new URL('/?error=User verification failed', baseUrl)
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

    console.log('Exchanging authorization code for access token...');
    console.log('Using redirect URI:', clioRedirectUri);
    console.log('Authorization code:', code?.substring(0, 10) + '...');

    // CLIO expects form-encoded data, not JSON
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
      console.error('=== Token Exchange Failed ===');
      console.error('Status:', tokenResponse.status);
      console.error('Status Text:', tokenResponse.statusText);
      console.error('Response:', errorData);
      console.error('Request params:', {
        client_id: clioClientId,
        grant_type: 'authorization_code',
        redirect_uri: clioRedirectUri,
        code_length: code?.length
      });
      console.error('============================');
      
      return NextResponse.redirect(
        new URL(`/?error=Token exchange failed: ${tokenResponse.status}`, baseUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    
    console.log('🔍 Raw token response from CLIO:', {
      access_token: tokenData.access_token ? 'Present' : 'Missing',
      refresh_token: tokenData.refresh_token ? 'Present' : 'Missing',
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope
    });
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return NextResponse.redirect(
        new URL('/?error=No access token received', baseUrl)
      );
    }

    // Store ONLY in database for persistence across serverless function restarts
    // NO in-memory storage - doesn't work in serverless environments
    // CLIO tokens expire in 604800 seconds (7 days) according to their documentation
    const expiresIn = tokenData.expires_in || 604800;
    
    try {
      console.log('🗄️ Storing token in database for user:', userId);
      console.log('Token data received:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresIn,
        scope: tokenData.scope
      });
      
      // Store token directly using the authenticated user ID
      const storedToken = await DatabaseService.storeClioToken(
        userId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.token_type || 'Bearer',
        expiresIn,
        tokenData.scope || ''
      );
      
      if (storedToken) {
        console.log('✅ Token stored in database successfully:', storedToken.id);
      } else {
        console.error('❌ Failed to store token in database - storeClioToken returned null');
        return NextResponse.redirect(
          new URL('/?error=Token storage failed', baseUrl)
        );
      }
    } catch (dbError) {
      console.error('Database storage error:', dbError);
      console.error('Error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId,
        tokenDataKeys: Object.keys(tokenData)
      });
      return NextResponse.redirect(
        new URL('/?error=Database error', baseUrl)
      );
    }

    console.log('✅ Access token received and stored successfully');
    console.log('Token type:', tokenData.token_type);
    console.log('Expires in:', tokenData.expires_in, 'seconds');
    console.log('Scope:', tokenData.scope);
    
    console.log('🎉 OAuth flow completed - token stored in database');
    
    // Redirect back to the home page with success message
    return NextResponse.redirect(new URL('/?connected=true', baseUrl));

  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL('/?error=OAuth callback failed', baseUrl)
    );
  }
}
