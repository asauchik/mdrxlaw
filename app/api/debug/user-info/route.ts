import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return NextResponse.json({ error: 'Session error', details: sessionError.message }, { status: 401 });
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No user session found' }, { status: 401 });
    }
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
        app_metadata: session.user.app_metadata,
        created_at: session.user.created_at,
      },
      session: {
        access_token: session.access_token ? 'Present' : 'Missing',
        refresh_token: session.refresh_token ? 'Present' : 'Missing',
        expires_at: session.expires_at,
        expires_in: session.expires_in,
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('User info debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user info', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
