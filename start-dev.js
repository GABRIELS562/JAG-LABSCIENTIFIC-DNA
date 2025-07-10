#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function startServer(command, args, cwd, name, color) {
  return new Promise((resolve, reject) => {
    log(`🚀 Starting ${name}...`, color);
    
    const process = spawn(command, args, {
      cwd: cwd,
      stdio: 'pipe',
      shell: true
    });

    let started = false;

    process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${color}[${name}]${colors.reset} ${output.trim()}`);
      
      // Check for startup indicators
      if (!started) {
        if (
          (name === 'Frontend' && output.includes('ready in')) ||
          (name === 'Backend' && (output.includes('Optimized backend server running') || output.includes('listening on port')))
        ) {
          started = true;
          log(`✅ ${name} started successfully!`, colors.green);
          resolve(process);
        }
      }
    });

    process.stderr.on('data', (data) => {
      const output = data.toString();
      // Only show important errors, filter out warnings
      if (!output.includes('Warning') && !output.includes('deprecated')) {
        console.log(`${colors.red}[${name} ERROR]${colors.reset} ${output.trim()}`);
      }
    });

    process.on('close', (code) => {
      if (code !== 0) {
        log(`❌ ${name} exited with code ${code}`, colors.red);
        reject(new Error(`${name} failed to start`));
      }
    });

    process.on('error', (err) => {
      log(`❌ ${name} failed to start: ${err.message}`, colors.red);
      reject(err);
    });

    // Timeout after 30 seconds if not started
    setTimeout(() => {
      if (!started) {
        log(`⏰ ${name} startup timeout - but may still be starting...`, colors.yellow);
        resolve(process);
      }
    }, 30000);
  });
}

async function main() {
  log('🔧 Lab Scientific LIMS - Development Server Startup', colors.bright);
  log('=' .repeat(60), colors.cyan);

  try {
    // Kill any existing processes
    log('🧹 Cleaning up existing processes...', colors.yellow);
    spawn('pkill', ['-f', 'node server.js'], { stdio: 'ignore' });
    spawn('pkill', ['-f', 'vite'], { stdio: 'ignore' });
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start backend server using optimized server with SQLite performance
    const backendProcess = await startServer(
      'node',
      ['server-optimized.js'],
      path.join(__dirname, 'backend'),
      'Backend',
      colors.blue
    );

    // Wait a moment for backend to fully start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start frontend server
    const frontendProcess = await startServer(
      'npm',
      ['run', 'dev'],
      __dirname,
      'Frontend',
      colors.magenta
    );

    // Wait a moment for frontend to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Display final status
    log('=' .repeat(60), colors.cyan);
    log('🎉 LIMS Application Started Successfully!', colors.green);
    log('', colors.reset);
    log('📱 Frontend: http://localhost:5173 (or next available port)', colors.magenta);
    log('🔧 Backend:  http://localhost:3001', colors.blue);
    log('', colors.reset);
    log('💡 Tips:', colors.yellow);
    log('   • Refresh your browser if you see connection errors', colors.reset);
    log('   • Both servers will restart automatically on file changes', colors.reset);
    log('   • Press Ctrl+C to stop both servers', colors.reset);
    log('', colors.reset);
    log('🔍 Features to test:', colors.cyan);
    log('   • Photo capture in Register Client', colors.reset);
    log('   • Enhanced Sample Management with status counts', colors.reset);
    log('   • PCR Plate → Electrophoresis workflow', colors.reset);
    log('   • Connection status monitoring', colors.reset);
    log('=' .repeat(60), colors.cyan);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down servers...', colors.yellow);
      
      if (backendProcess) {
        backendProcess.kill('SIGTERM');
      }
      if (frontendProcess) {
        frontendProcess.kill('SIGTERM');
      }
      
      setTimeout(() => {
        log('✅ Servers stopped. Goodbye!', colors.green);
        process.exit(0);
      }, 2000);
    });

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    log(`❌ Failed to start servers: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main().catch(console.error);