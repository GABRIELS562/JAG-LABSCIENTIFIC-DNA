#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directories to process
const directories = [
  path.join(__dirname, '../src'),
  path.join(__dirname, '../backend')
];

// File extensions to process
const extensions = ['.js', '.jsx', '.ts', '.tsx'];

// Console patterns to remove (but keep console.error for debugging)
const consolePatterns = [
  /console\.(log|debug|info|warn)\([^)]*\);?\s*/g,
  /console\.(log|debug|info|warn)\([^{]*{[^}]*}\);?\s*/g,
  /console\.(log|debug|info|warn)\(`[^`]*`\);?\s*/g,
];

let filesProcessed = 0;
let statementsRemoved = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  consolePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      statementsRemoved += matches.length;
      content = content.replace(pattern, '');
    }
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesProcessed++;
    console.log(`✓ Processed: ${path.relative(process.cwd(), filePath)}`);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(file)) {
        walkDirectory(filePath);
      }
    } else if (extensions.includes(path.extname(file))) {
      processFile(filePath);
    }
  });
}

console.log('🧹 Removing console statements from production code...\n');

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDirectory(dir);
  }
});

console.log(`\n✅ Complete! Processed ${filesProcessed} files and removed ${statementsRemoved} console statements.`);
console.log('Note: console.error statements were preserved for error tracking.');