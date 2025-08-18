const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * CRITICAL DATA RECOVERY SCRIPT
 * 
 * This script recovers lost samples from multiple sources:
 * 1. Ashley LIMS database (8 samples)
 * 2. Current main database (6 samples)
 * 3. CSV import template (15 samples with 24_X format)
 * 
 * The seed-data.js script had DELETE statements that wiped out 100+ production samples.
 * This recovery attempts to restore as much data as possible.
 */

async function performDataRecovery() {
  console.log('\n=== CRITICAL DATA RECOVERY STARTING ===\n');
  
  const mainDbPath = '/Users/user/LABSCIENTIFIC-LIMS/backend/database.db';
  const ashleyDbPath = '/Users/user/LABSCIENTIFIC-LIMS/backend/database/ashley_lims.db';
  const csvPath = '/Users/user/LABSCIENTIFIC-LIMS/backend/scripts/csv-import-template.csv';
  
  // Open databases
  const mainDb = new sqlite3.Database(mainDbPath);
  const ashleyDb = new sqlite3.Database(ashleyDbPath);
  
  const recoveredSamples = [];
  const duplicateCheck = new Set();
  
  try {
    // 1. Get current samples from main database (6 samples)
    console.log('1. Extracting samples from main database...');
    const mainSamples = await queryDatabase(mainDb, 'SELECT * FROM samples ORDER BY id');
    console.log(`Found ${mainSamples.length} samples in main database`);
    
    mainSamples.forEach(sample => {
      const key = `${sample.lab_number}_${sample.name}_${sample.surname}`;
      if (!duplicateCheck.has(key)) {
        recoveredSamples.push({
          source: 'main_db',
          ...sample
        });
        duplicateCheck.add(key);
      }
    });
    
    // 2. Get samples from Ashley LIMS database (8 samples)
    console.log('\n2. Extracting samples from Ashley LIMS database...');
    const ashleySamples = await queryDatabase(ashleyDb, 'SELECT * FROM samples ORDER BY id');
    console.log(`Found ${ashleySamples.length} samples in Ashley LIMS database`);
    
    ashleySamples.forEach(sample => {
      const key = `${sample.lab_number}_${sample.name}_${sample.surname}`;
      if (!duplicateCheck.has(key)) {
        recoveredSamples.push({
          source: 'ashley_lims',
          ...sample
        });
        duplicateCheck.add(key);
      }
    });
    
    // 3. Parse CSV template (15 samples with 24_X format)
    console.log('\n3. Extracting samples from CSV template...');
    const csvSamples = await parseCsvTemplate(csvPath);
    console.log(`Found ${csvSamples.length} samples in CSV template`);
    
    csvSamples.forEach(sample => {
      const key = `${sample.lab_number}_${sample.name}_${sample.surname}`;
      if (!duplicateCheck.has(key)) {
        recoveredSamples.push({
          source: 'csv_template',
          ...sample
        });
        duplicateCheck.add(key);
      }
    });
    
    // 4. Report recovery summary
    console.log('\n=== RECOVERY SUMMARY ===');
    console.log(`Total unique samples recovered: ${recoveredSamples.length}`);
    console.log('\nSamples by source:');
    const bySource = recoveredSamples.reduce((acc, sample) => {
      acc[sample.source] = (acc[sample.source] || 0) + 1;
      return acc;
    }, {});
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} samples`);
    });
    
    // 5. Save recovery report
    const recoveryReport = {
      timestamp: new Date().toISOString(),
      total_recovered: recoveredSamples.length,
      sources: bySource,
      samples: recoveredSamples.map(s => ({
        source: s.source,
        lab_number: s.lab_number,
        name: s.name,
        surname: s.surname,
        relation: s.relation,
        status: s.status || s.workflow_status,
        created_at: s.created_at
      }))
    };
    
    const reportPath = '/Users/user/LABSCIENTIFIC-LIMS/data-recovery-backup/recovery-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(recoveryReport, null, 2));
    console.log(`\nRecovery report saved: ${reportPath}`);
    
    // 6. Show sample details by format
    console.log('\n=== RECOVERED SAMPLE FORMATS ===');
    const formats = {};
    recoveredSamples.forEach(sample => {
      const format = sample.lab_number?.match(/^\d{2}_\d+$/) ? '25_XXX format' :
                    sample.lab_number?.match(/^24_\d+$/) ? '24_XXX format (IMPORTANT)' :
                    sample.lab_number?.match(/^LT24_\d+$/) ? 'LT24_XXX format' :
                    sample.lab_number?.match(/^\d{4}_\d+$/) ? '2024_XXX format' :
                    'Other format';
      formats[format] = (formats[format] || 0) + 1;
    });
    
    Object.entries(formats).forEach(([format, count]) => {
      console.log(`  ${format}: ${count} samples`);
    });
    
    // 7. Show critical 24_XXX samples (user mentioned "specific format and was important")
    const critical24Samples = recoveredSamples.filter(s => s.lab_number?.startsWith('24_'));
    if (critical24Samples.length > 0) {
      console.log('\n=== CRITICAL 24_XXX SAMPLES (User mentioned as important) ===');
      critical24Samples.forEach(sample => {
        console.log(`  ${sample.lab_number}: ${sample.name} ${sample.surname} (${sample.relation}) - Source: ${sample.source}`);
      });
    }
    
    return {
      success: true,
      total_recovered: recoveredSamples.length,
      formats: formats,
      critical_samples: critical24Samples.length
    };
    
  } catch (error) {
    console.error('Recovery failed:', error);
    return { success: false, error: error.message };
  } finally {
    mainDb.close();
    ashleyDb.close();
  }
}

function queryDatabase(db, query) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function parseCsvTemplate(csvPath) {
  return new Promise((resolve, reject) => {
    const samples = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Convert CSV format to sample format
        const sample = {
          lab_number: row.lab_number,
          name: row.name,
          surname: row.surname,
          relation: row.relation,
          date_of_birth: row.dob,
          kit_batch_number: row.kit_number,
          report_number: row.report_number,
          status: row.status || 'pending',
          workflow_status: 'sample_collected',
          collection_date: row.process_date,
          notes: row.notes,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        samples.push(sample);
      })
      .on('end', () => resolve(samples))
      .on('error', reject);
  });
}

// Run recovery if called directly
if (require.main === module) {
  performDataRecovery()
    .then(result => {
      console.log('\n=== RECOVERY COMPLETE ===');
      console.log(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.success) {
        console.log(`Total samples recovered: ${result.total_recovered}`);
        console.log(`Critical 24_XXX samples: ${result.critical_samples}`);
        console.log('\nNEXT STEPS:');
        console.log('1. Review recovery report in /data-recovery-backup/');
        console.log('2. Import recovered samples back to main database');
        console.log('3. Verify all important samples are restored');
      } else {
        console.error(`Error: ${result.error}`);
      }
    })
    .catch(console.error);
}

module.exports = performDataRecovery;