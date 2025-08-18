const db = require('../services/database');
const fs = require('fs');
const csv = require('csv-parser');

/**
 * FIXED IMPORT FOR CRITICAL 24_XXX SAMPLES
 * 
 * This script specifically imports the critical 24_XXX samples with proper status mapping.
 */

async function importCriticalSamplesFixed() {
  console.log('\n=== IMPORTING CRITICAL 24_XXX SAMPLES (FIXED) ===\n');
  
  try {
    const csvPath = '/Users/user/LABSCIENTIFIC-LIMS/backend/scripts/csv-import-template.csv';
    const samples = [];
    
    // Parse CSV with proper status mapping
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Map CSV status to valid database status
          let status = 'pending'; // default
          if (row.status === 'urgent' || row.status === 'ReRun') {
            status = 'processing'; // urgent cases are processing
          } else if (row.status === '') {
            status = 'pending';
          }
          
          const sample = {
            lab_number: row.lab_number,
            name: row.name,
            surname: row.surname,
            relation: row.relation,
            date_of_birth: row.dob,
            kit_batch_number: row.kit_number,
            report_number: row.report_number,
            status: status,
            workflow_status: 'sample_collected',
            collection_date: row.process_date || new Date().toISOString().split('T')[0],
            notes: `CRITICAL SAMPLE - ${row.notes || ''} - Status was: ${row.status}`.trim(),
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
          };
          samples.push(sample);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
    
    console.log(`Found ${samples.length} samples in CSV template`);
    
    // Filter for 24_XXX samples only
    const critical24Samples = samples.filter(s => s.lab_number.startsWith('24_'));
    console.log(`Critical 24_XXX samples found: ${critical24Samples.length}`);
    
    // Check which samples already exist
    const existingSamples = db.db.prepare('SELECT lab_number FROM samples WHERE lab_number LIKE ?').all('24_%');
    const existingLabNumbers = new Set(existingSamples.map(s => s.lab_number));
    
    const samplesToImport = critical24Samples.filter(s => !existingLabNumbers.has(s.lab_number));
    console.log(`Samples to import (excluding duplicates): ${samplesToImport.length}`);
    
    let importedCount = 0;
    const currentCount = db.db.prepare('SELECT COUNT(*) as count FROM samples').get().count;
    
    // Import each critical sample
    for (const sample of samplesToImport) {
      try {
        const sampleData = {
          sample_id: `S${String(importedCount + currentCount + 1).padStart(3, '0')}`,
          lab_number: sample.lab_number,
          name: sample.name,
          surname: sample.surname,
          relation: sample.relation,
          status: sample.status, // now properly mapped
          workflow_status: sample.workflow_status,
          collection_date: sample.collection_date,
          test_purpose: 'paternity',
          client_type: 'paternity',
          sample_type: 'buccal_swab',
          gender: sample.relation.toLowerCase().includes('child') && sample.relation.includes('M') ? 'M' : 
                 sample.relation.toLowerCase().includes('child') && sample.relation.includes('F') ? 'F' : 'M',
          notes: sample.notes,
          kit_batch_number: sample.kit_batch_number,
          report_number: sample.report_number,
          created_at: sample.created_at
        };
        
        const result = db.createSample(sampleData);
        importedCount++;
        console.log(`✅ Imported: ${sample.lab_number} - ${sample.name} ${sample.surname} (${sample.relation}) - Status: ${sample.status}`);
      } catch (error) {
        console.error(`❌ Failed to import ${sample.lab_number}:`, error.message);
      }
    }
    
    // Also import LT24_ samples
    const ltSamples = samples.filter(s => s.lab_number.startsWith('LT24_'));
    console.log(`\nLT24_ samples found: ${ltSamples.length}`);
    
    const existingLTSamples = db.db.prepare('SELECT lab_number FROM samples WHERE lab_number LIKE ?').all('LT24_%');
    const existingLTNumbers = new Set(existingLTSamples.map(s => s.lab_number));
    
    const ltSamplesToImport = ltSamples.filter(s => !existingLTNumbers.has(s.lab_number));
    console.log(`LT24_ samples to import: ${ltSamplesToImport.length}`);
    
    for (const sample of ltSamplesToImport) {
      try {
        const sampleData = {
          sample_id: `S${String(importedCount + currentCount + 1).padStart(3, '0')}`,
          lab_number: sample.lab_number,
          name: sample.name,
          surname: sample.surname,
          relation: sample.relation,
          status: sample.status,
          workflow_status: sample.workflow_status,
          collection_date: sample.collection_date,
          test_purpose: 'legal_proceedings',
          client_type: 'lt',
          sample_type: 'buccal_swab',
          gender: 'M',
          notes: sample.notes,
          kit_batch_number: sample.kit_batch_number,
          report_number: sample.report_number,
          created_at: sample.created_at
        };
        
        const result = db.createSample(sampleData);
        importedCount++;
        console.log(`✅ Imported LT: ${sample.lab_number} - ${sample.name} ${sample.surname} (${sample.relation})`);
      } catch (error) {
        console.error(`❌ Failed to import LT ${sample.lab_number}:`, error.message);
      }
    }
    
    const finalCount = db.db.prepare('SELECT COUNT(*) as count FROM samples').get().count;
    
    console.log('\n=== CRITICAL SAMPLES IMPORT COMPLETE ===');
    console.log(`Samples before: ${currentCount}`);
    console.log(`Critical samples imported: ${importedCount}`);
    console.log(`Total samples now: ${finalCount}`);
    
    // List all 24_XXX samples in database
    const all24Samples = db.db.prepare('SELECT lab_number, name, surname, relation, status FROM samples WHERE lab_number LIKE ? OR lab_number LIKE ? ORDER BY lab_number').all('24_%', 'LT24_%');
    console.log('\n=== ALL CRITICAL 24_XXX SAMPLES IN DATABASE ===');
    all24Samples.forEach(sample => {
      console.log(`  ${sample.lab_number}: ${sample.name} ${sample.surname} (${sample.relation}) - ${sample.status}`);
    });
    
    return {
      success: true,
      imported: importedCount,
      total_24_samples: all24Samples.length,
      final_count: finalCount
    };
    
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error: error.message };
  }
}

// Run import if called directly
if (require.main === module) {
  importCriticalSamplesFixed()
    .then(result => {
      if (result.success) {
        console.log('\n🎆 CRITICAL SAMPLES RECOVERY COMPLETE!');
        console.log(`📊 Total 24_XXX format samples in database: ${result.total_24_samples}`);
        console.log(`💯 Database now contains ${result.final_count} total samples`);
      } else {
        console.error('❌ Critical import failed:', result.error);
      }
    })
    .catch(console.error);
}

module.exports = importCriticalSamplesFixed;