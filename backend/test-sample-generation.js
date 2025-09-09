#!/usr/bin/env node

/**
 * Test script for live sample generation and tracking
 * This will start generating samples and show them progressing through the workflow
 */

require('dotenv').config({ path: '../.env' });

const EnhancedSampleCycler = require('./services/enhanced-sample-cycler');
const db = require('./services/database');

console.log('🚀 Starting Live Sample Generation Test');
console.log('=====================================');

async function testSampleGeneration() {
  try {
    // Initialize database
    console.log('📊 Initializing database connection...');
    await db.initialize();
    console.log('✅ Database connected');

    // Check current sample count
    const currentCount = await db.get(`
      SELECT COUNT(*) as count FROM samples WHERE status = 'active'
    `);
    console.log(`📈 Current active samples: ${currentCount?.count || 0}`);

    // Start the sample cycler
    console.log('\n🔄 Starting Enhanced Sample Cycler...');
    const cycler = new EnhancedSampleCycler(db);
    cycler.start();
    console.log('✅ Sample Cycler started');
    console.log('\n⏱️  Samples will be generated every 10 seconds');
    console.log('📊 Workflow stages: sample_collected → extraction → pcr → analysis → review → report_sent');
    console.log('\nPress Ctrl+C to stop\n');

    // Monitor samples every 5 seconds
    setInterval(async () => {
      try {
        // Get workflow distribution
        const distribution = await db.all(`
          SELECT workflow_status, COUNT(*) as count 
          FROM samples 
          WHERE status = 'active'
          GROUP BY workflow_status
          ORDER BY workflow_status
        `);

        // Get recent samples
        const recentSamples = await db.all(`
          SELECT lab_number, name, surname, workflow_status, 
                 created_at, updated_at
          FROM samples 
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 5
        `);

        // Display stats
        console.clear();
        console.log('🧬 JAG DNA Lab - Live Sample Tracking');
        console.log('=====================================');
        console.log(new Date().toLocaleString());
        console.log('\n📊 Workflow Distribution:');
        console.log('------------------------');
        
        let total = 0;
        distribution.forEach(stage => {
          const bar = '█'.repeat(Math.min(stage.count, 20));
          console.log(`${stage.workflow_status.padEnd(20)} ${bar} ${stage.count}`);
          total += parseInt(stage.count);
        });
        
        console.log(`\nTotal Active: ${total} samples`);
        
        console.log('\n🔬 Recent Samples:');
        console.log('----------------');
        recentSamples.forEach(sample => {
          console.log(`${sample.lab_number} - ${sample.name} ${sample.surname} - ${sample.workflow_status}`);
        });

        // Get cycler stats
        const stats = cycler.getStats();
        console.log('\n📈 Performance Stats:');
        console.log('-------------------');
        console.log(`Generated: ${stats.samplesGenerated}`);
        console.log(`Progressed: ${stats.samplesProgressed}`);
        console.log(`Completed: ${stats.samplesCompleted}`);
        console.log(`Throughput: ${stats.averageThroughput.toFixed(1)}/hour`);

      } catch (error) {
        console.error('Monitor error:', error.message);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  await db.close();
  process.exit(0);
});

// Run the test
testSampleGeneration();