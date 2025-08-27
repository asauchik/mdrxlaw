import { supabaseAdmin } from './lib/supabase.js';

async function testTokenStorage() {
  try {
    console.log('Testing token storage with admin client...');
    
    const userId = 'a361d1cf-f547-4bce-b590-c55d3d042ecd'; // Real user ID from auth.users
    
    // Try to store a token
    const { data, error } = await supabaseAdmin
      .from('clio_tokens')
      .insert([{
        user_id: userId,
        access_token: 'test_admin_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'test'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error storing token:', error);
    } else {
      console.log('✅ Token stored successfully:', data);
      
      // Clean up - delete the test token
      const { error: deleteError } = await supabaseAdmin
        .from('clio_tokens')
        .delete()
        .eq('access_token', 'test_admin_token');
        
      if (deleteError) {
        console.error('Warning: Could not clean up test token:', deleteError);
      } else {
        console.log('✅ Test token cleaned up');
      }
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testTokenStorage();
