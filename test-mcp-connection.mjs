#!/usr/bin/env node

import { spawn } from 'child_process';
import { createRequire } from 'module';

console.log('🔌 Testing MCP Server Connection...');

// Set up environment
process.env.SUPABASE_ACCESS_TOKEN = 'sbp_472116ba098949e7ce447ebc0c977ecc264da7a8';

console.log('📡 Starting Supabase MCP Server...');

// Start the MCP server
const mcpServer = spawn('npx', [
  '-y',
  '@supabase/mcp-server-supabase@latest',
  '--project-ref=enmihktqnwcjnlnsnljt'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

let serverReady = false;

mcpServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📤 MCP Server Output:', output);
  
  // Look for signs that the server is ready
  if (output.includes('Server running') || output.includes('ready') || output.includes('listening')) {
    serverReady = true;
    console.log('✅ MCP Server appears to be ready!');
  }
});

mcpServer.stderr.on('data', (data) => {
  const error = data.toString();
  console.log('❌ MCP Server Error:', error);
});

mcpServer.on('close', (code) => {
  console.log(`🔌 MCP Server exited with code ${code}`);
});

// Wait a moment for server to start
setTimeout(() => {
  if (serverReady) {
    console.log('🎉 MCP Server is running successfully!');
  } else {
    console.log('⏳ MCP Server is starting up...');
  }
  
  console.log('📋 Next steps:');
  console.log('1. Restart Claude Desktop to load the MCP configuration');
  console.log('2. The MCP server should be available for direct database queries');
  console.log('3. You can use tools like supabase_db_query to interact with the database');
  
  // Keep the server running for a bit
  setTimeout(() => {
    console.log('🛑 Stopping test server...');
    mcpServer.kill();
    process.exit(0);
  }, 10000);
  
}, 3000);
