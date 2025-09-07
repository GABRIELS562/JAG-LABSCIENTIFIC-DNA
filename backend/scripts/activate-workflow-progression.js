#!/usr/bin/env node

/**
 * Activate Workflow Progression
 * Makes samples visibly move through workflow stages every few seconds
 */

const Database = require('better-sqlite3');
const path = require('path');

class WorkflowActivator {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.db = null;
    this.interval = null;
    
    // Workflow progression map
    this.workflowProgression = {
      'sample_collected': 'pcr_ready',
      'pcr_ready': 'pcr_batched',
      'pcr_batched': 'pcr_completed',
      'pcr_completed': 'electro_ready',
      'electro_ready': 'electro_batched',
      'electro_batched': 'electro_completed',
      'electro_completed': 'analysis_ready',
      'analysis_ready': 'analysis_completed',
      'analysis_completed': 'report_ready',
      'report_ready': 'report_sent',
      'report_sent': 'sample_collected' // Loop back to start
    };
  }

  initialize() {
    console.log('🚀 Activating Workflow Progression');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  progressSamples() {
    try {
      // Get all samples
      const samples = this.db.prepare(`
        SELECT id, lab_number, workflow_status, case_number
        FROM samples 
        WHERE case_number LIKE 'PAT-MEM-%'
           OR case_number LIKE 'PAT-2025-%'
        ORDER BY id
      `).all();
      
      if (samples.length === 0) {
        console.log('❌ No samples found to progress');
        return;
      }
      
      // Progress each sample to next stage
      const updateStmt = this.db.prepare(`
        UPDATE samples 
        SET workflow_status = ?, 
            updated_at = datetime('now')
        WHERE id = ?
      `);
      
      let progressCount = 0;
      samples.forEach(sample => {
        const nextStage = this.workflowProgression[sample.workflow_status];
        if (nextStage) {
          updateStmt.run(nextStage, sample.id);
          progressCount++;
        }
      });
      
      // Get updated distribution
      const distribution = this.db.prepare(`
        SELECT workflow_status, COUNT(*) as count
        FROM samples 
        GROUP BY workflow_status
        ORDER BY workflow_status
      `).all();
      
      console.log(`✅ Progressed ${progressCount} samples`);
      console.log('📊 Current distribution:');
      distribution.forEach(d => {
        const bar = '█'.repeat(Math.min(d.count, 20));
        console.log(`  ${d.workflow_status.padEnd(20)} ${bar} ${d.count}`);
      });
      console.log('');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  start(intervalSeconds = 5) {
    console.log(`⏰ Progressing samples every ${intervalSeconds} seconds`);
    console.log('👀 Watch the dashboard to see samples moving through stages!\n');
    
    // Progress immediately
    this.progressSamples();
    
    // Set up interval
    this.interval = setInterval(() => {
      this.progressSamples();
    }, intervalSeconds * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Workflow progression stopped');
    }
    if (this.db) {
      this.db.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const activator = new WorkflowActivator();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping workflow progression...');
    activator.stop();
    process.exit(0);
  });
  
  activator.initialize();
  activator.start(5); // Progress every 5 seconds for visibility
  
  console.log('🎯 Workflow progression active. Press Ctrl+C to stop.\n');
}

module.exports = WorkflowActivator;