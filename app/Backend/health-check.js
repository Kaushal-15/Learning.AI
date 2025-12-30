#!/usr/bin/env node
/**
 * Health Check Script
 * Validates environment and checks if port 3000 is available
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found! Copy .env.example to .env and configure it.');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Check required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Check if port 3000 is already in use
const PORT = 3000;
const server = http.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${PORT} is already in use. Attempting to free it...`);
    // The kill-port command in package.json will handle this
    server.close();
    process.exit(0);
  } else {
    console.error('❌ Health check failed:', err.message);
    server.close();
    process.exit(1);
  }
});

server.once('listening', () => {
  console.log('✅ Health check passed - port is available');
  server.close();
  process.exit(0);
});

server.listen(PORT);
