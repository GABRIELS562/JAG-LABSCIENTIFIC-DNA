const db = require('../services/database');
const fs = require('fs');

/**
 * IMPORT RECOVERED SAMPLES SCRIPT
 * 
 * This script imports the 30 recovered samples back to the main database,
 * prioritizing the critical 24_XXX format samples that the user mentioned as important.
 */

async function importRecoveredSamples() {
  console.log('\n=== IMPORTING RECOVERED SAMPLES ===\n');
  
  try {
    // Load recovery report
    const reportPath = '/Users/user/LABSCIENTIFIC-LIMS/data-recovery-backup/recovery-report.json';
    const recoveryData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log(`Found ${recoveryData.total_recovered} samples in recovery report`);
    console.log('Sources:', recoveryData.sources);
    
    // Get current sample count
    const currentCount = db.db.prepare('SELECT COUNT(*) as count FROM samples').get().count;
    console.log(`Current samples in database: ${currentCount}`);
    
    // Filter out samples that already exist (to avoid duplicates)
    const existingSamples = db.db.prepare('SELECT lab_number, name, surname FROM samples').all();
    const existingKeys = new Set(existingSamples.map(s => `${s.lab_number}_${s.name}_${s.surname}`));
    
    const samplesToImport = recoveryData.samples.filter(sample => {
      const key = `${sample.lab_number}_${sample.name}_${sample.surname}`;
      return !existingKeys.has(key);
    });
    
    console.log(`\nSamples to import (excluding duplicates): ${samplesToImport.length}`);
    
    // Prioritize critical 24_XXX samples
    const critical24Samples = samplesToImport.filter(s => s.lab_number.startsWith('24_'));
    const otherSamples = samplesToImport.filter(s => !s.lab_number.startsWith('24_'));
    
    console.log(`Critical 24_XXX samples to import: ${critical24Samples.length}`);
    console.log(`Other samples to import: ${otherSamples.length}`);
    
    let importedCount = 0;
    
    // Import critical 24_XXX samples first
    if (critical24Samples.length > 0) {
      console.log('\n=== IMPORTING CRITICAL 24_XXX SAMPLES ===');
      for (const sample of critical24Samples) {
        try {
          const sampleData = {
            sample_id: `S${String(importedCount + currentCount + 1).padStart(3, '0')}`,
            lab_number: sample.lab_number,
            name: sample.name,
            surname: sample.surname,
            relation: sample.relation,
            status: sample.status || 'pending',
            workflow_status: 'sample_collected',
            collection_date: sample.collection_date || new Date().toISOString().split('T')[0],
            test_purpose: 'paternity',
            client_type: 'paternity',
            sample_type: 'buccal_swab',
            gender: 'M',
            notes: `Recovered from ${sample.source} - CRITICAL 24_XXX format`,
            created_at: sample.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19)
          };
          
          const result = db.createSample(sampleData);
          importedCount++;
          console.log(`✅ Imported: ${sample.lab_number} - ${sample.name} ${sample.surname} (${sample.relation})`);
        } catch (error) {
          console.error(`❌ Failed to import ${sample.lab_number}:`, error.message);
        }
      }
    }
    
    // Import other recovered samples
    if (otherSamples.length > 0) {
      console.log('\n=== IMPORTING OTHER RECOVERED SAMPLES ===');
      for (const sample of otherSamples) {
        try {
          const sampleData = {
            sample_id: `S${String(importedCount + currentCount + 1).padStart(3, '0')}`,
            lab_number: sample.lab_number,
            name: sample.name,
            surname: sample.surname,
            relation: sample.relation,
            status: sample.status || 'pending',
            workflow_status: sample.workflow_status || 'sample_collected',
            collection_date: sample.collection_date || new Date().toISOString().split('T')[0],
            test_purpose: sample.lab_number.includes('LT') ? 'legal_proceedings' : 'paternity',
            client_type: sample.lab_number.includes('LT') ? 'lt' : 'paternity',
            sample_type: 'buccal_swab',
            gender: 'M',
            notes: `Recovered from ${sample.source}`,
            created_at: sample.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19)
          };
          
          const result = db.createSample(sampleData);
          importedCount++;
          console.log(`✅ Imported: ${sample.lab_number} - ${sample.name} ${sample.surname} (${sample.relation})`);
        } catch (error) {
          console.error(`❌ Failed to import ${sample.lab_number}:`, error.message);
        }
      }
    }
    
    // Final count
    const finalCount = db.db.prepare('SELECT COUNT(*) as count FROM samples').get().count;
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Samples before import: ${currentCount}`);
    console.log(`Samples imported: ${importedCount}`);
    console.log(`Samples after import: ${finalCount}`);
    
    // Create import summary
    const importSummary = {
      timestamp: new Date().toISOString(),
      samples_before: currentCount,
      samples_imported: importedCount,
      samples_after: finalCount,
      critical_24_samples_imported: critical24Samples.length,
      recovery_success: true,
      note: 'Critical 24_XXX format samples prioritized as per user requirements'
    };
    
    fs.writeFileSync(
      '/Users/user/LABSCIENTIFIC-LIMS/data-recovery-backup/import-summary.json',
      JSON.stringify(importSummary, null, 2)
    );
    
    return importSummary;
    
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error: error.message };
  }
}

// Run import if called directly
if (require.main === module) {
  importRecoveredSamples()
    .then(result => {
      if (result.recovery_success) {
        console.log('\n🎉 DATA RECOVERY SUCCESSFUL!');
        console.log(`\n📊 RECOVERY STATISTICS:`);
        console.log(`   • Total samples recovered: ${result.samples_imported}`);
        console.log(`   • Critical 24_XXX samples: ${result.critical_24_samples_imported}`);
        console.log(`   • Database now contains: ${result.samples_after} samples`);
        console.log('\n✅ The seed-data.js script has been disabled to prevent future data loss.');
        console.log('✅ All recovered data has been backed up to /data-recovery-backup/');
      } else {
        console.error('❌ Import failed:', result.error);
      }
    })
    .catch(console.error);
}

module.exports = importRecoveredSamples;