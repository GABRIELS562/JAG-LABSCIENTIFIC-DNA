const { spawn } = require('child_process');
const path = require('path');

console.log('Starting frontend server...');
console.log('Working directory:', process.cwd());

const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

vite.on('error', (err) => {
  console.error('Failed to start frontend:', err);
});

vite.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});

console.log('Frontend server starting...');