import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/auth';

// Returns raw token row (masked) + scope + expiry diagnostics.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  const token = auth.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Invalid user' }, { status: 401 });

  const row = await DatabaseService.getClioToken(user.id);
  if (!row) return NextResponse.json({ hasToken: false });
  const expiresAt = new Date(new Date(row.created_at).getTime() + row.expires_in * 1000);
  return NextResponse.json({
    hasToken: true,
    tokenId: row.id,
    scope: row.scope,
    expires_in: row.expires_in,
    created_at: row.created_at,
    expires_at: expiresAt.toISOString(),
    has_refresh_token: !!row.refresh_token,
    access_token_prefix: row.access_token.substring(0, 8) + '…',
  });
}
