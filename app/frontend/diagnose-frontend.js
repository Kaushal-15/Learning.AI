#!/usr/bin/env node

/**
 * Frontend Diagnostic Script
 * Checks frontend configuration and connectivity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnoseFrontend() {
  console.log('🔍 Diagnosing Frontend Issues...\n');

  // 1. Check Environment Configuration
  console.log('1. Environment Configuration:');
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('   ✅ .env file exists');
      
      if (envContent.includes('VITE_API_BASE_URL')) {
        const apiUrl = envContent.match(/VITE_API_BASE_URL=(.+)/)?.[1];
        console.log(`   ✅ API Base URL: ${apiUrl}`);
      } else {
        console.log('   ❌ VITE_API_BASE_URL not found in .env');
      }
    } else {
      console.log('   ❌ .env file not found');
    }
  } catch (error) {
    console.log('   ❌ Error reading .env:', error.message);
  }

  // 2. Check Package.json
  console.log('\n2. Package Configuration:');
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('   ✅ package.json exists');
    console.log(`   ✅ Project name: ${packageJson.name}`);
    console.log(`   ✅ Scripts available: ${Object.keys(packageJson.scripts).join(', ')}`);
  } catch (error) {
    console.log('   ❌ Error reading package.json:', error.message);
  }

  // 3. Check Component Files
  console.log('\n3. Component Files:');
  const componentsPath = path.join(__dirname, 'src', 'components');
  // Check App.jsx in src directory
  const appPath = path.join(__dirname, 'src', 'App.jsx');
  if (fs.existsSync(appPath)) {
    console.log('   ✅ App.jsx exists in src/');
  } else {
    console.log('   ❌ App.jsx missing from src/');
  }

  const requiredComponents = [
    'Dashboard.jsx',
    'AdaptiveQuizTest.jsx',
    'Quiz.jsx',
    'Login.jsx'
  ];

  requiredComponents.forEach(component => {
    const componentPath = path.join(componentsPath, component);
    if (fs.existsSync(componentPath)) {
      console.log(`   ✅ ${component} exists`);
    } else {
      console.log(`   ❌ ${component} missing`);
    }
  });

  // 4. Check Vite Configuration
  console.log('\n4. Vite Configuration:');
  const viteConfigPath = path.join(__dirname, 'vite.config.js');
  if (fs.existsSync(viteConfigPath)) {
    console.log('   ✅ vite.config.js exists');
  } else {
    console.log('   ❌ vite.config.js missing');
  }

  // 5. Check for Common Issues
  console.log('\n5. Common Issues Check:');
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules directory exists');
  } else {
    console.log('   ❌ node_modules missing - run npm install');
  }

  // Check if dist directory exists (build output)
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('   ⚠️  dist directory exists (previous build)');
  } else {
    console.log('   ✅ No dist directory (clean state)');
  }

  console.log('\n📋 Recommendations:');
  console.log('   1. Ensure backend is running on port 3000');
  console.log('   2. Check VITE_API_BASE_URL in .env matches backend URL');
  console.log('   3. Verify all required components exist');
  console.log('   4. Run npm run dev to start development server');
  console.log('   5. Check browser console for JavaScript errors');

  console.log('\n🚀 Quick Fix Commands:');
  console.log('   npm install          # Install dependencies');
  console.log('   npm run dev          # Start development server');
  console.log('   npm run build        # Build for production');
}

diagnoseFrontend().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});