import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    CLIO_CLIENT_ID: process.env.CLIO_CLIENT_ID ? 'SET' : 'MISSING',
    CLIO_CLIENT_SECRET: process.env.CLIO_CLIENT_SECRET ? 'SET' : 'MISSING',
    CLIO_REDIRECT_URI: process.env.CLIO_REDIRECT_URI ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ? 'true' : 'false',
    VERCEL_URL: process.env.VERCEL_URL || 'not set'
  };

  return NextResponse.json({
    environment: envVars,
    timestamp: new Date().toISOString()
  });
}
