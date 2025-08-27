import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the user email
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

    // Get user email from state parameter
    const userEmail = state;
    if (!userEmail) {
      console.error('No user email in state parameter');
      return NextResponse.redirect(
        new URL('/?error=User authentication error', baseUrl)
      );
    }

    console.log('Processing OAuth callback for user:', userEmail);

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
      console.log('🗄️ Storing token in database for user:', userEmail);
      
      // Get or create user by email
      let user = await DatabaseService.getUserByEmail(userEmail);
      if (!user) {
        user = await DatabaseService.createUser(userEmail);
      }
      
      if (user) {
        console.log('👤 Found/created user:', user.id);
        const storedToken = await DatabaseService.storeClioToken(
          user.id,
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.token_type || 'Bearer',
          expiresIn,
          tokenData.scope || ''
        );
        
        if (storedToken) {
          console.log('✅ Token stored in database successfully:', storedToken.id);
        } else {
          console.error('❌ Failed to store token in database');
          return NextResponse.redirect(
            new URL('/?error=Token storage failed', baseUrl)
          );
        }
      } else {
        console.error('❌ Could not get/create user for database storage');
        return NextResponse.redirect(
          new URL('/?error=User setup failed', baseUrl)
        );
      }
    } catch (dbError) {
      console.error('Database storage error:', dbError);
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
