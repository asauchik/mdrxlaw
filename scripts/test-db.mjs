import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function testDatabase() {
  console.log('🧪 Testing Supabase database connection...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...')
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Connection failed:', error.message)
      return
    }

    console.log('✅ Database connection successful')
    console.log('📊 Found', data?.length || 0, 'users in database')

    // Test creating a user
    console.log('2️⃣ Testing user creation...')
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        email: 'test@mdrxlaw.com',
        name: 'Test User'
      }])
      .select()
      .single()

    if (createError) {
      if (createError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Test user already exists, fetching existing user...')
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'test@mdrxlaw.com')
          .single()
        
        if (existingUser) {
          console.log('✅ Using existing test user:', existingUser.id)
          await testTokenOperations(supabase, existingUser.id)
        }
      } else {
        console.error('❌ User creation failed:', createError.message)
      }
    } else if (newUser) {
      console.log('✅ User created successfully:', newUser.id)
      await testTokenOperations(supabase, newUser.id)
      
      // Clean up test user
      console.log('🧹 Cleaning up test data...')
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id)
      console.log('✅ Test user cleaned up')
    }

    // Test default user setup
    console.log('3️⃣ Setting up default user...')
    const { data: defaultUser, error: defaultError } = await supabase
      .from('users')
      .upsert([{
        email: 'default@mdrxlaw.com',
        name: 'Default User'
      }])
      .select()
      .single()

    if (defaultError) {
      console.error('❌ Default user setup failed:', defaultError.message)
    } else {
      console.log('✅ Default user ready:', defaultUser.email)
    }

    console.log('🎉 All database tests completed!')

  } catch (error) {
    console.error('💥 Database test failed:', error)
  }
}

async function testTokenOperations(supabase, userId) {
  console.log('🔑 Testing token operations...')
  
  // Store a token
  const { error: tokenError } = await supabase
    .from('clio_tokens')
    .insert([{
      user_id: userId,
      access_token: 'test_access_token_12345',
      refresh_token: 'test_refresh_token_67890',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write'
    }])
    .select()
    .single()

  if (tokenError) {
    console.error('❌ Token storage failed:', tokenError.message)
  } else {
    console.log('✅ Token stored successfully')

    // Retrieve the token
    const { data: retrievedToken } = await supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (retrievedToken && retrievedToken.access_token === 'test_access_token_12345') {
      console.log('✅ Token retrieved successfully')
    } else {
      console.error('❌ Token retrieval failed')
    }

    // Delete the token
    const { error: deleteError } = await supabase
      .from('clio_tokens')
      .delete()
      .eq('user_id', userId)

    if (!deleteError) {
      console.log('✅ Token deleted successfully')
    } else {
      console.error('❌ Token deletion failed:', deleteError.message)
    }
  }
}

// Run the test
testDatabase()
