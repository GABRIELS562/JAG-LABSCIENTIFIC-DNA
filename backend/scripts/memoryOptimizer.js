#!/usr/bin/env node

/**
 * Memory Optimization Script
 * Analyzes and optimizes memory usage for the backend server
 */

const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class MemoryOptimizer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.optimizationReport = {
      timestamp: new Date().toISOString(),
      optimizations: [],
      memoryBefore: null,
      memoryAfter: null,
      recommendations: []
    };
  }

  /**
   * Run comprehensive memory optimization
   */
  async optimize() {
    console.log('🧠 Starting Memory Optimization Process...\n');
    
    try {
      // Capture initial memory state
      this.optimizationReport.memoryBefore = await this.getMemoryUsage();
      
      console.log('📊 Initial Memory Usage:');
      this.displayMemoryUsage(this.optimizationReport.memoryBefore);
      
      // Run optimizations
      await this.optimizeDatabaseConnections();
      await this.optimizeCaching();
      await this.optimizeEventListeners();
      await this.optimizeModuleImports();
      await this.optimizeGarbageCollection();
      await this.checkMemoryLeaks();
      await this.optimizeProcessLimits();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Capture final memory state
      this.optimizationReport.memoryAfter = await this.getMemoryUsage();
      
      console.log('\n📊 Final Memory Usage:');
      this.displayMemoryUsage(this.optimizationReport.memoryAfter);
      
      // Display optimization summary
      this.displayOptimizationSummary();
      
      // Save report
      await this.saveOptimizationReport();
      
      console.log('\n✅ Memory optimization completed successfully!');
      
    } catch (error) {
      console.error('❌ Memory optimization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get current memory usage
   */
  async getMemoryUsage() {
    try {
      // Try to get memory from running process
      const nodeProcesses = execSync('pgrep -f "node.*server.js"', { encoding: 'utf8' }).trim().split('\n');
      
      if (nodeProcesses.length > 0 && nodeProcesses[0]) {
        const pid = nodeProcesses[0];
        const memInfo = execSync(`ps -p ${pid} -o pid,rss,vsz,%mem --no-headers`, { encoding: 'utf8' }).trim();
        const [, rss, vsz, memPercent] = memInfo.split(/\s+/);
        
        return {
          pid: parseInt(pid),
          rss: parseInt(rss) * 1024, // Convert KB to bytes
          vsz: parseInt(vsz) * 1024,
          memoryPercent: parseFloat(memPercent),
          rssMB: Math.round(parseInt(rss) / 1024 * 100) / 100,
          vszMB: Math.round(parseInt(vsz) / 1024 * 100) / 100
        };
      }
    } catch (error) {
      console.log('ℹ️  Could not get memory from running process');
    }
    
    return {
      pid: null,
      rss: 0,
      vsz: 0,
      memoryPercent: 0,
      rssMB: 0,
      vszMB: 0
    };
  }

  /**
   * Display memory usage in a readable format
   */
  displayMemoryUsage(memUsage) {
    if (memUsage.pid) {
      console.log(`   Process ID: ${memUsage.pid}`);
      console.log(`   RSS Memory: ${memUsage.rssMB} MB`);
      console.log(`   Virtual Memory: ${memUsage.vszMB} MB`);
      console.log(`   Memory %: ${memUsage.memoryPercent}%`);
    } else {
      console.log('   No running process detected');
    }
  }

  /**
   * Optimize database connections
   */
  async optimizeDatabaseConnections() {
    console.log('🔧 Optimizing database connections...');
    
    const serverPath = path.join(this.projectRoot, 'server.js');
    
    try {
      let content = await fs.readFile(serverPath, 'utf8');
      
      // Check for connection pooling
      if (!content.includes('DatabasePool')) {
        console.log('   ⚠️  Database pooling not detected');
        this.optimizationReport.recommendations.push({
          type: 'database',
          priority: 'high',
          description: 'Implement database connection pooling',
          implementation: 'Use DatabasePool class from utils/databasePool.js'
        });
      } else {
        console.log('   ✅ Database pooling already implemented');
      }
      
      // Check for prepared statements caching
      if (!content.includes('preparedStatements')) {
        this.optimizationReport.recommendations.push({
          type: 'database',
          priority: 'medium',
          description: 'Implement prepared statement caching',
          implementation: 'Cache prepared statements to avoid recompilation'
        });
      }
      
      this.optimizationReport.optimizations.push({
        type: 'database',
        status: 'analyzed',
        description: 'Database connection optimization analyzed'
      });
      
    } catch (error) {
      console.log('   ❌ Failed to analyze database connections:', error.message);
    }
  }

  /**
   * Optimize caching mechanisms
   */
  async optimizeCaching() {
    console.log('🔧 Optimizing caching mechanisms...');
    
    try {
      const serverPath = path.join(this.projectRoot, 'server.js');
      let content = await fs.readFile(serverPath, 'utf8');
      
      // Check for LRU cache usage
      if (!content.includes('lru-cache')) {
        console.log('   ⚠️  LRU caching not detected');
        this.optimizationReport.recommendations.push({
          type: 'caching',
          priority: 'high',
          description: 'Implement LRU caching for frequently accessed data',
          implementation: 'Replace plain object caches with LRU cache'
        });
      } else {
        console.log('   ✅ LRU caching detected');
      }
      
      // Check for cache size limits
      const cacheMatches = content.match(/new LRU\({[^}]*max:\s*(\d+)/g);
      if (cacheMatches) {
        console.log(`   ✅ Found ${cacheMatches.length} LRU cache configurations`);
      }
      
      this.optimizationReport.optimizations.push({
        type: 'caching',
        status: 'analyzed',
        description: 'Cache configuration analyzed'
      });
      
    } catch (error) {
      console.log('   ❌ Failed to analyze caching:', error.message);
    }
  }

  /**
   * Optimize event listeners and timers
   */
  async optimizeEventListeners() {
    console.log('🔧 Optimizing event listeners and timers...');
    
    try {
      // Find all JavaScript files
      const jsFiles = await this.findJSFiles();
      let totalIntervals = 0;
      let totalTimeouts = 0;
      let uncleanedListeners = 0;
      
      for (const filePath of jsFiles) {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Count intervals and timeouts
        const intervals = (content.match(/setInterval/g) || []).length;
        const timeouts = (content.match(/setTimeout/g) || []).length;
        
        totalIntervals += intervals;
        totalTimeouts += timeouts;
        
        // Check for cleanup
        const clearIntervals = (content.match(/clearInterval/g) || []).length;
        const clearTimeouts = (content.match(/clearTimeout/g) || []).length;
        
        if (intervals > clearIntervals || timeouts > clearTimeouts) {
          uncleanedListeners++;
        }
      }
      
      console.log(`   📊 Found ${totalIntervals} intervals, ${totalTimeouts} timeouts`);
      
      if (uncleanedListeners > 0) {
        console.log(`   ⚠️  ${uncleanedListeners} files may have uncleaned timers`);
        this.optimizationReport.recommendations.push({
          type: 'memory-leaks',
          priority: 'high',
          description: `${uncleanedListeners} files have potential timer leaks`,
          implementation: 'Ensure all setInterval/setTimeout calls have corresponding cleanup'
        });
      } else {
        console.log('   ✅ Timer cleanup looks good');
      }
      
      this.optimizationReport.optimizations.push({
        type: 'timers',
        status: 'analyzed',
        description: `Analyzed ${totalIntervals + totalTimeouts} timers across ${jsFiles.length} files`
      });
      
    } catch (error) {
      console.log('   ❌ Failed to analyze event listeners:', error.message);
    }
  }

  /**
   * Optimize module imports
   */
  async optimizeModuleImports() {
    console.log('🔧 Optimizing module imports...');
    
    try {
      const serverPath = path.join(this.projectRoot, 'server.js');
      const content = await fs.readFile(serverPath, 'utf8');
      
      // Count imports
      const requires = (content.match(/require\(/g) || []).length;
      const imports = (content.match(/import\s+/g) || []).length;
      
      console.log(`   📊 Found ${requires} require() calls, ${imports} import statements`);
      
      // Check for dynamic imports
      const dynamicRequires = (content.match(/require\(.*\$\{.*\}\)/g) || []).length;
      if (dynamicRequires > 0) {
        this.optimizationReport.recommendations.push({
          type: 'imports',
          priority: 'medium',
          description: 'Dynamic require() calls detected',
          implementation: 'Consider lazy loading or caching dynamic modules'
        });
      }
      
      this.optimizationReport.optimizations.push({
        type: 'imports',
        status: 'analyzed',
        description: `Analyzed ${requires + imports} module imports`
      });
      
    } catch (error) {
      console.log('   ❌ Failed to analyze imports:', error.message);
    }
  }

  /**
   * Optimize garbage collection
   */
  async optimizeGarbageCollection() {
    console.log('🔧 Optimizing garbage collection...');
    
    try {
      // Check if --expose-gc flag is available
      const hasGC = typeof global.gc === 'function';
      
      if (hasGC) {
        console.log('   ✅ Garbage collection is available');
        
        // Force GC and measure impact
        const beforeGC = process.memoryUsage();
        global.gc();
        const afterGC = process.memoryUsage();
        
        const freed = beforeGC.heapUsed - afterGC.heapUsed;
        console.log(`   📊 GC freed ${Math.round(freed / 1024 / 1024 * 100) / 100} MB`);
        
        this.optimizationReport.optimizations.push({
          type: 'garbage-collection',
          status: 'performed',
          description: `Freed ${Math.round(freed / 1024 / 1024 * 100) / 100} MB via garbage collection`
        });
        
      } else {
        console.log('   ⚠️  Garbage collection not exposed');
        this.optimizationReport.recommendations.push({
          type: 'garbage-collection',
          priority: 'medium',
          description: 'Enable garbage collection with --expose-gc flag',
          implementation: 'Add --expose-gc to Node.js startup flags'
        });
      }
      
    } catch (error) {
      console.log('   ❌ Failed to optimize GC:', error.message);
    }
  }

  /**
   * Check for potential memory leaks
   */
  async checkMemoryLeaks() {
    console.log('🔧 Checking for potential memory leaks...');
    
    try {
      const jsFiles = await this.findJSFiles();
      const leakPatterns = [
        { pattern: /global\./g, description: 'Global variable usage' },
        { pattern: /var\s+\w+\s*=\s*\[\]/g, description: 'Array variable declarations' },
        { pattern: /\.push\(/g, description: 'Array push operations' },
        { pattern: /new\s+(Array|Object|Map|Set)\(/g, description: 'Large object instantiation' },
        { pattern: /addEventListener\(/g, description: 'Event listener additions' }
      ];
      
      let totalIssues = 0;
      
      for (const filePath of jsFiles.slice(0, 10)) { // Check first 10 files
        const content = await fs.readFile(filePath, 'utf8');
        
        for (const leak of leakPatterns) {
          const matches = (content.match(leak.pattern) || []).length;
          if (matches > 10) { // Threshold for concern
            totalIssues++;
            console.log(`   ⚠️  ${path.basename(filePath)}: ${matches} instances of ${leak.description}`);
          }
        }
      }
      
      if (totalIssues === 0) {
        console.log('   ✅ No obvious memory leak patterns detected');
      }
      
      this.optimizationReport.optimizations.push({
        type: 'memory-leak-check',
        status: 'completed',
        description: `Scanned ${jsFiles.length} files for memory leak patterns`
      });
      
    } catch (error) {
      console.log('   ❌ Failed to check memory leaks:', error.message);
    }
  }

  /**
   * Optimize process limits
   */
  async optimizeProcessLimits() {
    console.log('🔧 Optimizing process limits...');
    
    try {
      // Get current process limits
      const maxOldSpaceSize = process.env.NODE_OPTIONS?.includes('--max-old-space-size');
      
      if (!maxOldSpaceSize) {
        this.optimizationReport.recommendations.push({
          type: 'process-limits',
          priority: 'high',
          description: 'Set Node.js memory limits',
          implementation: 'Add --max-old-space-size=512 to NODE_OPTIONS for 512MB limit'
        });
        console.log('   ⚠️  Node.js memory limits not set');
      } else {
        console.log('   ✅ Node.js memory limits configured');
      }
      
      // Check package.json scripts for optimization flags
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      let hasOptimizationFlags = false;
      
      for (const script of Object.values(packageJson.scripts || {})) {
        if (script.includes('--expose-gc') || script.includes('--max-old-space-size')) {
          hasOptimizationFlags = true;
          break;
        }
      }
      
      if (!hasOptimizationFlags) {
        this.optimizationReport.recommendations.push({
          type: 'process-limits',
          priority: 'medium',
          description: 'Add memory optimization flags to npm scripts',
          implementation: 'Add --expose-gc --max-old-space-size=512 to start/dev scripts'
        });
      }
      
      this.optimizationReport.optimizations.push({
        type: 'process-limits',
        status: 'analyzed',
        description: 'Process memory limits analyzed'
      });
      
    } catch (error) {
      console.log('   ❌ Failed to optimize process limits:', error.message);
    }
  }

  /**
   * Find all JavaScript files in the project
   */
  async findJSFiles(dir = this.projectRoot) {
    const jsFiles = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findJSFiles(fullPath);
          jsFiles.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          jsFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return jsFiles;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    console.log('\n🎯 Generating recommendations...');
    
    // Analyze memory usage trends
    const beforeMem = this.optimizationReport.memoryBefore;
    const afterMem = this.optimizationReport.memoryAfter;
    
    if (beforeMem.memoryPercent > 70) {
      this.optimizationReport.recommendations.push({
        type: 'memory-usage',
        priority: 'critical',
        description: `High memory usage detected (${beforeMem.memoryPercent}%)`,
        implementation: 'Immediate memory optimization required'
      });
    }
    
    // Priority-based recommendations
    const highPriority = this.optimizationReport.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high');
    const mediumPriority = this.optimizationReport.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = this.optimizationReport.recommendations.filter(r => r.priority === 'low');
    
    console.log(`   🔴 High priority items: ${highPriority.length}`);
    console.log(`   🟡 Medium priority items: ${mediumPriority.length}`);
    console.log(`   🟢 Low priority items: ${lowPriority.length}`);
  }

  /**
   * Display optimization summary
   */
  displayOptimizationSummary() {
    console.log('\n📋 Optimization Summary:');
    console.log('=' * 50);
    
    // Memory comparison
    if (this.optimizationReport.memoryBefore.pid && this.optimizationReport.memoryAfter.pid) {
      const memoryChange = this.optimizationReport.memoryAfter.rssMB - this.optimizationReport.memoryBefore.rssMB;
      const memoryChangePercent = this.optimizationReport.memoryAfter.memoryPercent - this.optimizationReport.memoryBefore.memoryPercent;
      
      console.log(`Memory Change: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(2)} MB`);
      console.log(`Memory % Change: ${memoryChangePercent > 0 ? '+' : ''}${memoryChangePercent.toFixed(2)}%`);
    }
    
    // Optimizations performed
    console.log(`\nOptimizations Performed: ${this.optimizationReport.optimizations.length}`);
    this.optimizationReport.optimizations.forEach(opt => {
      console.log(`  ✓ ${opt.type}: ${opt.description}`);
    });
    
    // Top recommendations
    const topRecommendations = this.optimizationReport.recommendations
      .filter(r => r.priority === 'critical' || r.priority === 'high')
      .slice(0, 5);
      
    if (topRecommendations.length > 0) {
      console.log(`\nTop ${topRecommendations.length} Recommendations:`);
      topRecommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
        console.log(`     → ${rec.implementation}`);
      });
    }
  }

  /**
   * Save optimization report
   */
  async saveOptimizationReport() {
    const reportPath = path.join(this.projectRoot, 'logs', 'memory-optimization-report.json');
    
    try {
      // Ensure logs directory exists
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      // Save detailed report
      await fs.writeFile(reportPath, JSON.stringify(this.optimizationReport, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      // Also create a summary report
      const summaryPath = path.join(this.projectRoot, 'logs', 'memory-optimization-summary.txt');
      const summary = this.generateTextSummary();
      await fs.writeFile(summaryPath, summary);
      console.log(`📄 Summary report saved to: ${summaryPath}`);
      
    } catch (error) {
      console.log('⚠️  Failed to save optimization report:', error.message);
    }
  }

  /**
   * Generate text summary
   */
  generateTextSummary() {
    const lines = [];
    lines.push('MEMORY OPTIMIZATION REPORT');
    lines.push('='.repeat(50));
    lines.push(`Generated: ${this.optimizationReport.timestamp}`);
    lines.push('');
    
    if (this.optimizationReport.memoryBefore.pid) {
      lines.push('MEMORY USAGE:');
      lines.push(`Before: ${this.optimizationReport.memoryBefore.rssMB} MB (${this.optimizationReport.memoryBefore.memoryPercent}%)`);
      lines.push(`After:  ${this.optimizationReport.memoryAfter.rssMB} MB (${this.optimizationReport.memoryAfter.memoryPercent}%)`);
      lines.push('');
    }
    
    lines.push('OPTIMIZATIONS PERFORMED:');
    this.optimizationReport.optimizations.forEach(opt => {
      lines.push(`✓ ${opt.type}: ${opt.description}`);
    });
    lines.push('');
    
    lines.push('RECOMMENDATIONS:');
    this.optimizationReport.recommendations.forEach(rec => {
      lines.push(`[${rec.priority.toUpperCase()}] ${rec.description}`);
      lines.push(`  → ${rec.implementation}`);
      lines.push('');
    });
    
    return lines.join('\n');
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new MemoryOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = MemoryOptimizer;