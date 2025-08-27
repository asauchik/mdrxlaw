import { supabaseAdmin, ClioToken } from './supabase';

// Auth user type that matches auth.users
interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  // User management - using auth.users directly
  static async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        console.error('Error listing users:', error);
        return null;
      }

      const user = data.users.find(u => u.email === email);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
      };
    } catch (error) {
      console.error('Database error getting user by email:', error);
      return null;
    }
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error) {
        console.error('Error getting user by ID:', error);
        return null;
      }

      if (!data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at,
      };
    } catch (error) {
      console.error('Database error getting user by ID:', error);
      return null;
    }
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
      
      if (!accessToken || accessToken.trim().length < 20) {
        console.error('❌ Refusing to store invalid / empty access token');
        return null;
      }

      // Upsert via SQL function (atomic, avoids race condition + delete window)
      console.log('� Upserting token via function upsert_clio_token');
      
      // Let's check if the user actually exists first using admin auth
      console.log('🔍 Verifying user exists in auth system...');
      try {
        const { data: userCheck, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userCheckError || !userCheck.user) {
          console.error('❌ User verification failed:', userCheckError);
          console.error('User ID being checked:', userId);
          return null;
        }
        console.log('✅ User verified:', userCheck.user.email);
      } catch (userError) {
        console.error('❌ Error verifying user:', userError);
        return null;
      }
      // Call the SQL function
      const { data, error } = await supabaseAdmin
        .rpc('upsert_clio_token', {
          p_user_id: userId,
            p_access_token: accessToken,
            p_refresh_token: refreshToken || null,
            p_token_type: tokenType,
            p_expires_in: expiresIn,
            p_scope: scope
        });

      if (error) {
        console.error('❌ Error storing CLIO token:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }
      const stored = Array.isArray(data) ? data[0] : data; // rpc can return row or array depending on config
      if (!stored) {
        console.error('❌ Upsert function returned no row');
        return null;
      }
      console.log('✅ CLIO token stored successfully (upsert):', stored.id);
      return stored as ClioToken;
    } catch (error) {
      console.error('💥 Database error storing CLIO token:', error);
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
  static async getAllAuthUsers(): Promise<AuthUser[]> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        console.error('Error getting all auth users:', error);
        return [];
      }

      return data.users.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
      }));
    } catch (error) {
      console.error('Database error getting all auth users:', error);
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
