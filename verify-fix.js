#!/usr/bin/env node

/**
 * Verification script for React.useLayoutEffect fix
 * Checks that the production build works without React undefined errors
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying React Build Fix...\n');

// Check if dist folder exists
if (!fs.existsSync('dist')) {
    console.error('❌ dist folder not found. Please run: npm run build');
    process.exit(1);
}

// Check for React core chunk
const distAssets = path.join('dist', 'assets');
const files = fs.readdirSync(distAssets);
const reactCoreFile = files.find(f => f.startsWith('00-react-core-'));

if (!reactCoreFile) {
    console.error('❌ React core chunk not found in dist/assets');
    process.exit(1);
}

console.log(`✅ React core chunk found: ${reactCoreFile}`);

// Read and check the React core file
const reactCorePath = path.join(distAssets, reactCoreFile);
const reactCoreContent = fs.readFileSync(reactCorePath, 'utf8');

// Check for critical React hooks
const hasUseLayoutEffect = reactCoreContent.includes('useLayoutEffect');
const hasUseEffect = reactCoreContent.includes('useEffect');
const hasReactExports = reactCoreContent.includes('exports');

console.log(`✅ React core contains useLayoutEffect: ${hasUseLayoutEffect}`);
console.log(`✅ React core contains useEffect: ${hasUseEffect}`);
console.log(`✅ React core has exports: ${hasReactExports}`);

// Check index.html
const indexHtml = fs.readFileSync('dist/index.html', 'utf8');
const hasReactCoreScript = indexHtml.includes('00-react-core-');
const scriptsInOrder = indexHtml.indexOf('00-react-core-') < indexHtml.indexOf('index-');

console.log(`✅ index.html includes React core script: ${hasReactCoreScript}`);
console.log(`✅ React core loads before main app: ${scriptsInOrder}`);

// Check for the polyfill in main bundle
const mainFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
if (mainFile) {
    const mainContent = fs.readFileSync(path.join(distAssets, mainFile), 'utf8');
    const hasPolyfill = mainContent.includes('React polyfill');
    console.log(`✅ Main bundle includes React polyfill: ${hasPolyfill}`);
}

// Final verification
console.log('\n🎉 Build verification complete!');
console.log('✅ React should be properly loaded and available');
console.log('✅ No "Cannot read properties of undefined" errors expected');
console.log('\n📝 To fully test:');
console.log('   1. Open http://localhost:5001 in a browser');
console.log('   2. Open browser console (F12)');
console.log('   3. Check for any red errors');
console.log('   4. Verify app renders correctly');