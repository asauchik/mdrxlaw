#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env.local') });

interface ClioToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  clio_user_id?: string;
  created_at: string;
  updated_at: string;
}

class SupabaseMCPServer {
  private server: Server;
  private supabase: any;

  constructor() {
    this.server = new Server(
      {
        name: 'supabase-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    this.setupToolHandlers();
    this.setupResourceHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'query_users',
            description: 'Query users table with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'Filter by email' },
                limit: { type: 'number', description: 'Limit results', default: 10 }
              }
            }
          },
          {
            name: 'query_tokens',
            description: 'Query CLIO tokens table with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'Filter by user ID' },
                limit: { type: 'number', description: 'Limit results', default: 10 }
              }
            }
          },
          {
            name: 'create_user',
            description: 'Create a new user',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'User email' },
                name: { type: 'string', description: 'User name' },
                clio_user_id: { type: 'string', description: 'CLIO user ID' }
              },
              required: ['email']
            }
          },
          {
            name: 'store_token',
            description: 'Store a CLIO token for a user',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'User ID' },
                access_token: { type: 'string', description: 'Access token' },
                refresh_token: { type: 'string', description: 'Refresh token' },
                token_type: { type: 'string', description: 'Token type', default: 'Bearer' },
                expires_in: { type: 'number', description: 'Expires in seconds', default: 604800 },
                scope: { type: 'string', description: 'Token scope', default: '' }
              },
              required: ['user_id', 'access_token']
            }
          },
          {
            name: 'delete_token',
            description: 'Delete CLIO tokens for a user',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'User ID' },
                token_id: { type: 'string', description: 'Specific token ID (optional)' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'check_token_validity',
            description: 'Check if tokens are expired',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'User ID' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'database_stats',
            description: 'Get database statistics',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'execute_sql',
            description: 'Execute raw SQL query (admin only)',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to execute' }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'query_users':
            return await this.queryUsers(args);
          case 'query_tokens':
            return await this.queryTokens(args);
          case 'create_user':
            return await this.createUser(args);
          case 'store_token':
            return await this.storeToken(args);
          case 'delete_token':
            return await this.deleteToken(args);
          case 'check_token_validity':
            return await this.checkTokenValidity(args);
          case 'database_stats':
            return await this.getDatabaseStats();
          case 'execute_sql':
            return await this.executeSql(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'supabase://users',
            mimeType: 'application/json',
            name: 'Users Table',
            description: 'All users in the database'
          },
          {
            uri: 'supabase://tokens',
            mimeType: 'application/json', 
            name: 'CLIO Tokens Table',
            description: 'All CLIO tokens in the database'
          },
          {
            uri: 'supabase://schema',
            mimeType: 'application/json',
            name: 'Database Schema',
            description: 'Database table structure'
          }
        ]
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      switch (uri) {
        case 'supabase://users':
          const { data: users } = await this.supabase.from('users').select('*');
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(users, null, 2)
              }
            ]
          };

        case 'supabase://tokens':
          const { data: tokens } = await this.supabase.from('clio_tokens').select('*');
          // Hide actual token values for security
          const sanitizedTokens = tokens?.map((token: ClioToken) => ({
            ...token,
            access_token: token.access_token?.substring(0, 20) + '...',
            refresh_token: token.refresh_token ? token.refresh_token.substring(0, 20) + '...' : null
          }));
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(sanitizedTokens, null, 2)
              }
            ]
          };

        case 'supabase://schema':
          const { data: schema } = await this.supabase
            .from('information_schema.columns')
            .select('table_name, column_name, data_type, is_nullable')
            .in('table_name', ['users', 'clio_tokens']);
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(schema, null, 2)
              }
            ]
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private async queryUsers(args: any) {
    let query = this.supabase.from('users').select('*');
    
    if (args.email) {
      query = query.eq('email', args.email);
    }
    
    if (args.limit) {
      query = query.limit(args.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Found ${data?.length || 0} users:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async queryTokens(args: any) {
    let query = this.supabase.from('clio_tokens').select('*');
    
    if (args.user_id) {
      query = query.eq('user_id', args.user_id);
    }
    
    if (args.limit) {
      query = query.limit(args.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    // Sanitize tokens for display
    const sanitizedTokens = data?.map((token: ClioToken) => ({
      ...token,
      access_token: token.access_token?.substring(0, 20) + '...',
      refresh_token: token.refresh_token ? token.refresh_token.substring(0, 20) + '...' : null
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${data?.length || 0} tokens:\n\n${JSON.stringify(sanitizedTokens, null, 2)}`
        }
      ]
    };
  }

  private async createUser(args: any) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([{
        email: args.email,
        name: args.name,
        clio_user_id: args.clio_user_id
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `User created successfully:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async storeToken(args: any) {
    // First delete existing tokens for the user
    await this.supabase
      .from('clio_tokens')
      .delete()
      .eq('user_id', args.user_id);

    const { data, error } = await this.supabase
      .from('clio_tokens')
      .insert([{
        user_id: args.user_id,
        access_token: args.access_token,
        refresh_token: args.refresh_token,
        token_type: args.token_type || 'Bearer',
        expires_in: args.expires_in || 604800,
        scope: args.scope || ''
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Token storage failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Token stored successfully:\nID: ${data.id}\nUser: ${data.user_id}\nType: ${data.token_type}\nExpires in: ${data.expires_in} seconds`
        }
      ]
    };
  }

  private async deleteToken(args: any) {
    let query = this.supabase.from('clio_tokens').delete();
    
    if (args.token_id) {
      query = query.eq('id', args.token_id);
    } else {
      query = query.eq('user_id', args.user_id);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Token deletion failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Tokens deleted successfully for ${args.token_id ? 'token ID: ' + args.token_id : 'user ID: ' + args.user_id}`
        }
      ]
    };
  }

  private async checkTokenValidity(args: any) {
    const { data: tokens, error } = await this.supabase
      .from('clio_tokens')
      .select('*')
      .eq('user_id', args.user_id);

    if (error) {
      throw new Error(`Token query failed: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No tokens found for user: ${args.user_id}`
          }
        ]
      };
    }

    const results = tokens.map((token: ClioToken) => {
      const created = new Date(token.created_at).getTime();
      const expiresAt = created + (token.expires_in * 1000);
      const now = Date.now();
      const isExpired = now > expiresAt;
      const timeLeft = Math.max(0, expiresAt - now);

      return {
        id: token.id,
        created: new Date(token.created_at).toISOString(),
        expires: new Date(expiresAt).toISOString(),
        isExpired,
        timeLeftSeconds: Math.floor(timeLeft / 1000),
        timeLeftDays: Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: `Token validity check for user ${args.user_id}:\n\n${JSON.stringify(results, null, 2)}`
        }
      ]
    };
  }

  private async getDatabaseStats() {
    const { data: userCount } = await this.supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const { data: tokenCount } = await this.supabase
      .from('clio_tokens')
      .select('id', { count: 'exact', head: true });

    const { data: recentTokens } = await this.supabase
      .from('clio_tokens')
      .select('created_at, expires_in')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      content: [
        {
          type: 'text',
          text: `Database Statistics:
- Total users: ${userCount?.length || 0}
- Total tokens: ${tokenCount?.length || 0}
- Recent tokens: ${JSON.stringify(recentTokens, null, 2)}`
        }
      ]
    };
  }

  private async executeSql(args: any) {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', { 
        query: args.query 
      });

      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `SQL executed successfully:\n\n${JSON.stringify(data, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `SQL execution not supported or failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supabase MCP server running on stdio');
  }
}

const server = new SupabaseMCPServer();
server.run().catch(console.error);
