#!/usr/bin/env node

/**
 * Start Live Workflow - Coordinated Sample Generation and Progression
 * This script starts both the memory-safe sample cycler and workflow progression
 * to create a live, flowing DNA testing workflow for DevOps demonstration
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Live DNA Testing Workflow');
console.log('=====================================');
console.log('This will:');
console.log('  1. Generate new samples with memory cap (100 max)');
console.log('  2. Progress samples through all workflow stages');
console.log('  3. Auto-cleanup old samples to prevent memory issues');
console.log('  4. Show live updates on both dashboards');
console.log('');

// Kill any existing processes first
console.log('🧹 Cleaning up any existing processes...');
try {
  require('child_process').execSync('pkill -f memory-safe-sample-cycler', { stdio: 'ignore' });
  require('child_process').execSync('pkill -f activate-workflow-progression', { stdio: 'ignore' });
  require('child_process').execSync('pkill -f generate-continuous-samples', { stdio: 'ignore' });
} catch (e) {
  // Ignore errors if processes aren't running
}

// Wait a moment for cleanup
setTimeout(() => {
  console.log('');
  console.log('📦 Starting Memory-Safe Sample Cycler...');
  const cycler = spawn('node', [
    path.join(__dirname, 'memory-safe-sample-cycler.js')
  ], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../../')
  });

  setTimeout(() => {
    console.log('');
    console.log('🔄 Starting Workflow Progression...');
    const progression = spawn('node', [
      path.join(__dirname, 'activate-workflow-progression.js')
    ], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../')
    });

    console.log('');
    console.log('✅ Live workflow is now running!');
    console.log('');
    console.log('📊 Monitor the workflow at:');
    console.log('  • Paternity Lab Dashboard: http://localhost:5173/');
    console.log('  • DNA Workflow Monitor: http://localhost:5173/forensic-dashboard');
    console.log('');
    console.log('⚡ Features:');
    console.log('  • Samples cycle through 11 workflow stages');
    console.log('  • Memory-capped at 100 samples maximum');
    console.log('  • Auto-cleanup prevents memory overflow');
    console.log('  • Real-time updates every 5-10 seconds');
    console.log('');
    console.log('🛑 Press Ctrl+C to stop all processes');
    console.log('');

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down live workflow...');
      cycler.kill();
      progression.kill();
      process.exit(0);
    });

    // Keep main process alive
    process.stdin.resume();
  }, 2000);
}, 1000);