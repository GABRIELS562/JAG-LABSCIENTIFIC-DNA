#!/usr/bin/env node
/**
 * Dependency Check Script for LIMS Application
 * Validates that all required npm packages are installed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking LIMS dependencies...\n');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const installedDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

// Required packages for backend
const requiredPackages = [
  // Core packages
  'express',
  'cors',
  'dotenv',
  'axios',
  'bcryptjs',
  'jsonwebtoken',

  // Database
  'pg',
  'better-sqlite3',

  // File handling
  'multer',
  'fs-extra',
  'xlsx',
  'exceljs',
  'pdfkit',
  'svg-to-pdfkit',

  // Utilities
  'node-cron',
  'winston',
  'winston-daily-rotate-file',
  'lru-cache',
  'xml2js',
  'googleapis',
  'chokidar',

  // Security & Performance
  'helmet',
  'express-rate-limit',
  'hpp',

  // DevOps & Monitoring
  'prom-client',
  'pidusage',

  // Additional tools
  'chalk',
  'js-yaml',
  'node-fetch',
  'nodemailer',
  'ws',
  'swagger-jsdoc',
  'swagger-ui-express',
  'chartjs-node-canvas',

  // Testing (dev dependencies)
  'supertest',
  '@faker-js/faker'
];

let missingPackages = [];
let outdatedPackages = [];

// Check for missing packages
console.log('📦 Checking required packages:\n');
requiredPackages.forEach(pkg => {
  if (installedDeps[pkg]) {
    console.log(`  ✅ ${pkg} (${installedDeps[pkg]})`);
  } else {
    console.log(`  ❌ ${pkg} (MISSING)`);
    missingPackages.push(pkg);
  }
});

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('\n⚠️  node_modules directory not found. Run "npm install" first.\n');
  process.exit(1);
}

// Check for actual installed packages
console.log('\n🔍 Verifying installed packages in node_modules...\n');
const notInstalled = [];
requiredPackages.forEach(pkg => {
  const modulePath = path.join('node_modules', pkg);
  if (!fs.existsSync(modulePath)) {
    notInstalled.push(pkg);
    console.log(`  ❌ ${pkg} not found in node_modules`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Dependency Check Summary:');
console.log('='.repeat(50));

if (missingPackages.length === 0 && notInstalled.length === 0) {
  console.log('✅ All required dependencies are properly installed!');
  console.log(`   Total packages checked: ${requiredPackages.length}`);
} else {
  if (missingPackages.length > 0) {
    console.log(`\n❌ Missing from package.json: ${missingPackages.length}`);
    console.log('   Run: npm install --save ' + missingPackages.join(' '));
  }

  if (notInstalled.length > 0) {
    console.log(`\n❌ Not installed in node_modules: ${notInstalled.length}`);
    console.log('   Run: npm install --force');
  }

  process.exit(1);
}

// Check for potential issues
console.log('\n🔍 Checking for potential issues...');

// Check if using PostgreSQL
if (installedDeps['better-sqlite3']) {
  console.log('⚠️  Note: better-sqlite3 is installed but production uses PostgreSQL');
}

// Check critical environment variables
const envExample = '.env.production.example';
if (fs.existsSync(envExample)) {
  console.log('✅ Production environment example found');
} else {
  console.log('⚠️  Missing .env.production.example file');
}

console.log('\n✅ Dependency check complete!\n');