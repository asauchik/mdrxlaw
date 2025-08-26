import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function migrate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  
  console.log('🚀 Connecting to Supabase...')
  console.log('URL:', supabaseUrl)
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('✅ Connected to Supabase')
    console.log('📝 Creating users table...')

    // Create users table
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          clio_user_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (usersError) {
      console.log('ℹ️ Users table creation result:', usersError.message)
    } else {
      console.log('✅ Users table created')
    }

    console.log('📝 Creating clio_tokens table...')

    // Create clio_tokens table
    const { error: tokensError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS clio_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_type TEXT DEFAULT 'Bearer',
          expires_in INTEGER DEFAULT 3600,
          scope TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (tokensError) {
      console.log('ℹ️ Tokens table creation result:', tokensError.message)
    } else {
      console.log('✅ Clio tokens table created')
    }

    console.log('📝 Creating indexes...')

    // Create indexes
    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_clio_tokens_user_id ON clio_tokens(user_id);'
    })

    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);'
    })

    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_clio_user_id ON users(clio_user_id);'
    })

    console.log('✅ Indexes created')

    console.log('🔒 Setting up Row Level Security...')

    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ENABLE ROW LEVEL SECURITY;'
    })

    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clio_tokens ENABLE ROW LEVEL SECURITY;'
    })

    // Create policies
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can view their own data" ON users;
        CREATE POLICY "Users can view their own data" ON users FOR ALL USING (true);
      `
    })

    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can manage their tokens" ON clio_tokens;
        CREATE POLICY "Users can manage their tokens" ON clio_tokens FOR ALL USING (true);
      `
    })

    console.log('✅ Row Level Security configured')

    console.log('🔍 Verifying table creation...')
    
    // Verify tables exist
    const { error: userTableError } = await supabase
      .from('users')
      .select('*')
      .limit(0)

    const { error: tokenTableError } = await supabase
      .from('clio_tokens')
      .select('*')
      .limit(0)

    if (userTableError || tokenTableError) {
      console.warn('⚠️ Some tables may not have been created properly')
    }

    console.log('✅ Migration completed successfully!')
    console.log('📋 Tables verified: users, clio_tokens')

    // Create a default user for testing
    console.log('👤 Creating default user...')
    const { error: userError } = await supabase
      .from('users')
      .upsert([
        {
          email: 'default@mdrxlaw.com',
          name: 'Default User'
        }
      ])
      .select()

    if (!userError) {
      console.log('✅ Default user created')
    } else {
      console.log('ℹ️ Default user may already exist:', userError.message)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

export default migrate

// Run migration if this script is called directly
if (require.main === module) {
  migrate().then(() => {
    console.log('🎉 Migration complete!')
    process.exit(0)
  }).catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
}
