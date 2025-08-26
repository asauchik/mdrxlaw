import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create the main client for frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create admin client for server-side operations (with service role key)
export const supabaseAdmin = createClient(
  supabaseUrl, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database types for TypeScript
export interface ClioToken {
  id: string
  user_id: string
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  clio_user_id?: string
  created_at: string
  updated_at: string
}
