// Simple in-memory token storage for development
// In production, you should use a secure database or encrypted storage

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  created_at: number;
}

class TokenStorage {
  private tokens: Map<string, TokenData> = new Map();

  // Store token with a user identifier (for now using 'default' for single user)
  storeToken(userId: string = 'default', tokenData: TokenData): void {
    tokenData.created_at = Date.now();
    this.tokens.set(userId, tokenData);
    console.log('✅ Token stored for user:', userId);
  }

  // Get token for user
  getToken(userId: string = 'default'): TokenData | null {
    return this.tokens.get(userId) || null;
  }

  // Check if token is expired
  isTokenExpired(userId: string = 'default'): boolean {
    const token = this.getToken(userId);
    if (!token) return true;
    
    const expiresAt = token.created_at + (token.expires_in * 1000);
    return Date.now() > expiresAt;
  }

  // Remove token
  removeToken(userId: string = 'default'): void {
    this.tokens.delete(userId);
    console.log('🗑️ Token removed for user:', userId);
  }

  // Get valid access token (check expiry)
  getValidAccessToken(userId: string = 'default'): string | null {
    if (this.isTokenExpired(userId)) {
      console.log('⚠️ Token expired for user:', userId);
      return null;
    }
    
    const token = this.getToken(userId);
    return token?.access_token || null;
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();
