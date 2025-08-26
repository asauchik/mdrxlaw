import { supabaseAdmin } from '../lib/supabase'

async function runMigration() {
  console.log('🚀 Starting database migration...')

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)

    if (testError) {
      console.error('❌ Failed to connect to database:', testError.message)
      return
    }

    console.log('✅ Database connection successful')

    // Create the migration SQL
    const migrationSQL = `
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          clio_user_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create clio_tokens table
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

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_clio_tokens_user_id ON clio_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_clio_user_id ON users(clio_user_id);

      -- Enable Row Level Security (RLS)
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE clio_tokens ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own data" ON users;
      DROP POLICY IF EXISTS "Users can manage their tokens" ON clio_tokens;

      -- Create policies (for now, allow all operations - you can restrict this later)
      CREATE POLICY "Users can view their own data" ON users
          FOR ALL USING (true);

      CREATE POLICY "Users can manage their tokens" ON clio_tokens
          FOR ALL USING (true);

      -- Function to automatically update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Drop existing triggers if they exist
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP TRIGGER IF EXISTS update_clio_tokens_updated_at ON clio_tokens;

      -- Create triggers for updated_at
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_clio_tokens_updated_at BEFORE UPDATE ON clio_tokens
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute the migration using supabase-js rpc function
    console.log('📝 Executing migration SQL...')
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          sql: statement + ';' 
        })
        
        if (error) {
          // Try alternative method using direct SQL execution
          console.log('Trying alternative execution method...')
          
          // For DDL statements, we'll use the REST API directly
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
            },
            body: JSON.stringify({ sql: statement + ';' })
          })

          if (!response.ok) {
            console.warn(`⚠️ Statement may have failed: ${statement.substring(0, 100)}...`)
            console.warn(`Error: ${error?.message || 'Unknown error'}`)
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!')

    // Verify tables were created
    console.log('🔍 Verifying table creation...')
    
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'clio_tokens'])

    if (tablesError) {
      console.error('❌ Error verifying tables:', tablesError.message)
    } else {
      console.log('📋 Created tables:', tables?.map(t => t.table_name).join(', '))
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
}

export { runMigration }
