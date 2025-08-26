import { supabaseAdmin, ClioToken, User } from './supabase';

export class DatabaseService {
  // User management
  static async createUser(email: string, name?: string, clioUserId?: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{ email, name, clio_user_id: clioUserId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      console.log('✅ User created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Database error creating user:', error);
      return null;
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting user by email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error getting user by email:', error);
      return null;
    }
  }

  static async getUserByClioId(clioUserId: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('clio_user_id', clioUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting user by CLIO ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error getting user by CLIO ID:', error);
      return null;
    }
  }

  // Default user management for single-user app
  static async getDefaultUser(): Promise<User | null> {
    console.log('🔍 Looking for default user: default@mdrxlaw.com');
    
    let user = await this.getUserByEmail('default@mdrxlaw.com');
    
    if (!user) {
      console.log('👤 Creating default user...');
      user = await this.createUser('default@mdrxlaw.com', 'Default User');
      
      if (user) {
        console.log('✅ Created default user:', user.id);
      } else {
        console.error('❌ Failed to create default user');
      }
    } else {
      console.log('✅ Found existing default user:', user.id);
    }
    
    return user;
  }

  // Token management
  static async storeClioToken(
    userId: string,
    accessToken: string,
    refreshToken?: string,
    tokenType: string = 'Bearer',
    expiresIn: number = 604800, // CLIO tokens expire in 7 days (604800 seconds)
    scope: string = ''
  ): Promise<ClioToken | null> {
    try {
      console.log('🔐 Storing CLIO token for user:', userId);
      console.log('Token details:', {
        tokenType,
        expiresIn,
        scope,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length
      });
      
      // First, delete any existing tokens for this user
      const { error: deleteError } = await supabaseAdmin
        .from('clio_tokens')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.warn('Warning deleting existing tokens:', deleteError.message);
      }

      // Insert the new token
      const { data, error } = await supabaseAdmin
        .from('clio_tokens')
        .insert([{
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokenType,
          expires_in: expiresIn,
          scope: scope
        }])
        .select()
        .single();

      if (error) {
        console.error('Error storing CLIO token:', error);
        return null;
      }

      console.log('✅ CLIO token stored successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Database error storing CLIO token:', error);
      return null;
    }
  }

  static async getClioToken(userId: string): Promise<ClioToken | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('clio_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting CLIO token:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error getting CLIO token:', error);
      return null;
    }
  }

  static async isTokenExpired(token: ClioToken): Promise<boolean> {
    const expiresAt = new Date(token.created_at).getTime() + (token.expires_in * 1000);
    return Date.now() > expiresAt;
  }

  static async getValidClioToken(userId: string): Promise<string | null> {
    try {
      const token = await this.getClioToken(userId);
      
      if (!token) {
        return null;
      }

      if (await this.isTokenExpired(token)) {
        console.log('CLIO token expired for user:', userId);
        // Delete expired token
        await this.deleteClioToken(userId);
        return null;
      }

      return token.access_token;
    } catch (error) {
      console.error('Error getting valid CLIO token:', error);
      return null;
    }
  }

  static async deleteClioToken(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('clio_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting CLIO token:', error);
        return false;
      }

      console.log('✅ CLIO token deleted successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('Database error deleting CLIO token:', error);
      return false;
    }
  }

  // Utility methods for debugging
  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*');

      if (error) {
        console.error('Error getting all users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error getting all users:', error);
      return [];
    }
  }

  static async getAllTokens(): Promise<ClioToken[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('clio_tokens')
        .select('*');

      if (error) {
        console.error('Error getting all tokens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error getting all tokens:', error);
      return [];
    }
  }
}
