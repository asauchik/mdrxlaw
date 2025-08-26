import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
