#!/usr/bin/env node
/**
 * Bundle Size Monitor
 * Quick script to monitor bundle sizes and detect regressions
 */

const fs = require('fs');
const path = require('path');

const DIST_PATH = path.join(__dirname, '..', 'dist', 'assets');
const SIZE_THRESHOLDS = {
  main: 500 * 1024, // 500KB
  feature: 100 * 1024, // 100KB per feature
  vendor: 500 * 1024, // 500KB per vendor chunk
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  if (!fs.existsSync(DIST_PATH)) {
    console.log('❌ Build not found. Run "npm run build" first.');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_PATH).filter(file => file.endsWith('.js'));
  const analysis = {
    main: [],
    features: [],
    vendors: [],
    other: [],
    total: 0
  };

  files.forEach(file => {
    const filePath = path.join(DIST_PATH, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    
    analysis.total += size;
    
    const fileInfo = { name: file, size, formatted: formatBytes(size) };
    
    if (file.startsWith('index-')) {
      analysis.main.push(fileInfo);
    } else if (file.startsWith('feature-')) {
      analysis.features.push(fileInfo);
    } else if (file.includes('vendor') || file.includes('mui') || file.includes('charts') || file.includes('react-vendor')) {
      analysis.vendors.push(fileInfo);
    } else {
      analysis.other.push(fileInfo);
    }
  });

  // Sort by size (descending)
  Object.keys(analysis).forEach(key => {
    if (Array.isArray(analysis[key])) {
      analysis[key].sort((a, b) => b.size - a.size);
    }
  });

  return analysis;
}

function generateReport() {
  const analysis = analyzeBundle();
  
  console.log('🎯 BUNDLE SIZE ANALYSIS REPORT');
  console.log('================================\n');
  
  // Main bundle analysis
  console.log('📦 MAIN BUNDLE');
  if (analysis.main.length > 0) {
    const mainBundle = analysis.main[0];
    const isWithinThreshold = mainBundle.size <= SIZE_THRESHOLDS.main;
    const status = isWithinThreshold ? '✅' : '❌';
    console.log(`${status} ${mainBundle.name}: ${mainBundle.formatted}`);
    console.log(`   Target: ${formatBytes(SIZE_THRESHOLDS.main)} | ${isWithinThreshold ? 'PASS' : 'FAIL'}\n`);
  }
  
  // Vendor bundles
  console.log('📚 VENDOR BUNDLES');
  analysis.vendors.forEach(bundle => {
    const isWithinThreshold = bundle.size <= SIZE_THRESHOLDS.vendor;
    const status = isWithinThreshold ? '✅' : '⚠️';
    console.log(`${status} ${bundle.name}: ${bundle.formatted}`);
  });
  console.log();
  
  // Feature chunks (top 10)
  console.log('🚀 FEATURE CHUNKS (Top 10)');
  analysis.features.slice(0, 10).forEach(bundle => {
    const isWithinThreshold = bundle.size <= SIZE_THRESHOLDS.feature;
    const status = isWithinThreshold ? '✅' : '⚠️';
    console.log(`${status} ${bundle.name}: ${bundle.formatted}`);
  });
  console.log();
  
  // Summary
  console.log('📊 SUMMARY');
  console.log(`Total Bundles: ${analysis.main.length + analysis.features.length + analysis.vendors.length + analysis.other.length}`);
  console.log(`Total Size: ${formatBytes(analysis.total)}`);
  console.log(`Main Bundle: ${analysis.main[0]?.formatted || 'N/A'}`);
  console.log(`Largest Feature: ${analysis.features[0]?.formatted || 'N/A'}`);
  console.log(`Largest Vendor: ${analysis.vendors[0]?.formatted || 'N/A'}`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  const largeFeatures = analysis.features.filter(f => f.size > SIZE_THRESHOLDS.feature);
  if (largeFeatures.length > 0) {
    console.log(`⚠️  ${largeFeatures.length} feature chunk(s) exceed 100KB - consider splitting further`);
  }
  
  const totalVendorSize = analysis.vendors.reduce((sum, v) => sum + v.size, 0);
  if (totalVendorSize > 1024 * 1024) {
    console.log(`⚠️  Total vendor size (${formatBytes(totalVendorSize)}) > 1MB - consider optimization`);
  }
  
  if (analysis.main[0]?.size <= SIZE_THRESHOLDS.main) {
    console.log('✅ Main bundle size optimization target achieved!');
  }
  
  console.log('\n🔧 MONITORING');
  console.log('Run this script after each build to monitor bundle size regressions.');
  console.log('View bundle-analysis.html for detailed chunk composition.');
}

if (require.main === module) {
  generateReport();
}

module.exports = { analyzeBundle, generateReport };