#!/usr/bin/env node

/**
 * Real-time Paternity Workflow Monitor
 * Displays live sample progression through workflow stages
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = 'http://localhost:3001/api';

// Color scheme for different stages
const stageColors = {
  'sample_collected': chalk.cyan,
  'pcr_ready': chalk.blue,
  'pcr_batched': chalk.blueBright,
  'pcr_completed': chalk.green,
  'electro_ready': chalk.yellow,
  'electro_batched': chalk.yellowBright,
  'electro_completed': chalk.magenta,
  'analysis_ready': chalk.magentaBright,
  'analysis_completed': chalk.greenBright,
  'report_ready': chalk.white,
  'report_sent': chalk.green.bold
};

// Stage display names
const stageNames = {
  'sample_collected': '📦 Collection',
  'pcr_ready': '🧪 PCR Ready',
  'pcr_batched': '🔬 PCR Batched',
  'pcr_completed': '✅ PCR Complete',
  'electro_ready': '⚡ Electro Ready',
  'electro_batched': '🔋 Electro Batched',
  'electro_completed': '✨ Electro Complete',
  'analysis_ready': '📊 Analysis Ready',
  'analysis_completed': '📈 Analysis Complete',
  'report_ready': '📝 Report Ready',
  'report_sent': '✉️ Report Sent'
};

let lastUpdate = {};
let cycleCount = 0;

async function fetchWorkflowStatus() {
  try {
    const response = await axios.get(`${API_BASE}/workflow/paternity/status`);
    return response.data.data;
  } catch (error) {
    console.error(chalk.red('Error fetching workflow status:'), error.message);
    return null;
  }
}

async function fetchSampleTracking() {
  try {
    const response = await axios.get(`${API_BASE}/workflow/sample-tracking`);
    return response.data.data;
  } catch (error) {
    console.error(chalk.red('Error fetching sample tracking:'), error.message);
    return null;
  }
}

function displayHeader() {
  console.clear();
  console.log(chalk.bold.cyan('═'.repeat(80)));
  console.log(chalk.bold.cyan('║') + chalk.bold.white(' JAG LABSCIENTIFIC - Paternity Workflow Monitor'.padEnd(78)) + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('═'.repeat(80)));
  console.log();
}

function displayWorkflowStatus(data) {
  if (!data) return;
  
  // Display overview
  console.log(chalk.bold('📊 Workflow Overview:'));
  console.log(`  Status: ${data.status === 'running' ? chalk.green('● Running') : chalk.red('● Stopped')}`);
  console.log(`  Total Samples: ${chalk.bold(data.totalSamples)}`);
  console.log(`  Cycles Completed: ${chalk.bold(data.cyclesCompleted || cycleCount)}`);
  console.log();
  
  // Track cycle completions
  if (data.cyclesCompleted > cycleCount) {
    cycleCount = data.cyclesCompleted;
    console.log(chalk.green.bold(`🎯 New cycle completed! Total: ${cycleCount}`));
    console.log();
  }
  
  // Display stage distribution
  console.log(chalk.bold('📈 Stage Distribution:'));
  console.log('─'.repeat(60));
  
  if (data.stageDistribution) {
    data.stageDistribution.forEach(stage => {
      const stageName = stageNames[stage.workflow_status] || stage.workflow_status;
      const colorFn = stageColors[stage.workflow_status] || chalk.white;
      const bar = '█'.repeat(Math.floor(stage.count / 2));
      
      console.log(`  ${colorFn(stageName.padEnd(20))} ${colorFn(bar)} ${chalk.bold(stage.count)} samples`);
      
      // Highlight changes
      if (lastUpdate[stage.workflow_status] && lastUpdate[stage.workflow_status] !== stage.count) {
        const diff = stage.count - lastUpdate[stage.workflow_status];
        if (diff > 0) {
          console.log(chalk.green(`    ↑ +${diff} samples entered this stage`));
        } else {
          console.log(chalk.yellow(`    ↓ ${Math.abs(diff)} samples left this stage`));
        }
      }
      lastUpdate[stage.workflow_status] = stage.count;
    });
  }
  
  console.log();
  
  // Display batch information
  if (data.batches && data.batches.length > 0) {
    console.log(chalk.bold('🔄 Active Batches:'));
    console.log('─'.repeat(60));
    data.batches.forEach(batch => {
      if (batch.sampleCount > 0) {
        const stageName = stageNames[batch.stage] || batch.stage;
        const colorFn = stageColors[batch.stage] || chalk.white;
        const progress = batch.stageProgress || 0;
        const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
        
        console.log(`  ${colorFn(batch.id.padEnd(20))} ${colorFn(stageName.padEnd(20))} [${progressBar}] ${progress}%`);
      }
    });
  }
  
  console.log();
  
  // Display recent cycle completions
  if (data.recentCycles && data.recentCycles.length > 0) {
    console.log(chalk.bold('🏁 Recent Cycle Completions:'));
    data.recentCycles.slice(0, 3).forEach(cycle => {
      const time = new Date(cycle.completed_at).toLocaleTimeString();
      console.log(chalk.gray(`  ${time} - ${cycle.batch_id} completed full cycle`));
    });
  }
}

function displaySampleHighlights(trackingData) {
  if (!trackingData || !trackingData.families) return;
  
  console.log();
  console.log(chalk.bold('👨‍👩‍👧 Sample Families (First 3):'));
  console.log('─'.repeat(60));
  
  trackingData.families.slice(0, 3).forEach(family => {
    console.log(`  Case: ${chalk.bold(family.caseNumber)}`);
    family.members.forEach(member => {
      const colorFn = stageColors[member.workflow_status] || chalk.white;
      console.log(`    ${member.relation.padEnd(15)} ${colorFn(member.stage_display || member.workflow_status)}`);
    });
  });
}

async function monitor() {
  displayHeader();
  
  const workflowData = await fetchWorkflowStatus();
  const trackingData = await fetchSampleTracking();
  
  displayWorkflowStatus(workflowData);
  displaySampleHighlights(trackingData);
  
  console.log();
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.gray('Updated:', new Date().toLocaleString()));
  console.log(chalk.gray('Press Ctrl+C to exit'));
}

// Main execution
console.log(chalk.yellow('Starting Paternity Workflow Monitor...'));
console.log(chalk.gray('Connecting to LIMS server at', API_BASE));

// Initial check
setTimeout(() => {
  monitor();
  
  // Update every 5 seconds
  setInterval(monitor, 5000);
}, 1000);

// Handle graceful exit
process.on('SIGINT', () => {
  console.log();
  console.log(chalk.yellow('Monitor stopped'));
  process.exit(0);
});