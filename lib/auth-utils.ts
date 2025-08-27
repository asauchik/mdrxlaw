import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function getCurrentUser(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get the authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  // Extract the token
  const token = authHeader.replace('Bearer ', '')
  
  // Get user from token
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }

  return user
}
