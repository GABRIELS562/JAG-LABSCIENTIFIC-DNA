#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/lims.db');
const db = new Database(dbPath);

// Read Google Sheets data
const dataPath = path.join(__dirname, '../data-recovery-backup/google-sheets-main.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('🔄 IMPORTING GOOGLE SHEETS DATA TO DATABASE');
console.log('============================================\n');

// Prepare insert statement
const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO samples (
        lab_number, name, surname, id_dob, relation,
        collection_date, submission_date, kit_batch_number,
        lab_batch_number, report_number, status, notes,
        workflow_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

let imported = 0;
let skipped = 0;

// Skip header row
const samples = data.slice(1);

samples.forEach((row, index) => {
    const [
        labNo, name, surname, idDob, relation,
        collDate, subDate, motherPresent, email,
        address, phone, kitBn, batchNo, reportNo,
        reportSent, comment
    ] = row;
    
    if (!labNo) {
        skipped++;
        return;
    }
    
    try {
        // Determine status based on comment
        let status = 'pending';
        // Note: 'urgent' is not a valid status in the schema, map to 'processing' or 'pending'
        if (comment === 'urgent') status = 'processing';
        else if (reportSent) status = 'completed';
        else if (batchNo) status = 'processing';
        
        // Determine workflow status
        let workflowStatus = 'sample_collected';
        if (reportSent) workflowStatus = 'report_sent';
        else if (reportNo) workflowStatus = 'report_ready';
        else if (batchNo && batchNo.includes('LDS_')) workflowStatus = 'pcr_batched';
        
        insertStmt.run(
            labNo,
            name || '',
            surname || '',
            idDob || '',
            relation || '',
            collDate || '',
            subDate || '',
            kitBn || '',
            batchNo || '',
            reportNo || '',
            status,
            comment || '',
            workflowStatus
        );
        
        imported++;
        
        if (imported <= 5) {
            console.log(`✅ Imported: ${labNo} - ${name || '(no name)'} ${surname || '(no surname)'}`);
        }
    } catch (error) {
        console.error(`❌ Error importing ${labNo}:`, error.message);
    }
});

console.log('\n📊 IMPORT SUMMARY');
console.log('=================');
console.log(`✅ Successfully imported: ${imported} samples`);
console.log(`⏭️  Skipped (no lab number): ${skipped} rows`);

// Show current database status
const totalSamples = db.prepare('SELECT COUNT(*) as count FROM samples').get();
const samplesByFormat = db.prepare(`
    SELECT 
        SUBSTR(lab_number, 1, INSTR(lab_number, '_')) as format,
        COUNT(*) as count
    FROM samples
    WHERE lab_number LIKE '%_%'
    GROUP BY format
    ORDER BY count DESC
`).all();

console.log(`\n📈 DATABASE STATUS`);
console.log('==================');
console.log(`Total samples in database: ${totalSamples.count}`);
console.log('\nSamples by format:');
samplesByFormat.forEach(({ format, count }) => {
    console.log(`  ${format}XXX: ${count} samples`);
});

// Show some actual samples
const recentSamples = db.prepare(`
    SELECT lab_number, name, surname, relation, status
    FROM samples
    ORDER BY created_at DESC
    LIMIT 10
`).all();

console.log('\n📋 Recently added samples:');
recentSamples.forEach(sample => {
    console.log(`  ${sample.lab_number}: ${sample.name || '(no name)'} ${sample.surname || '(no surname)'} - ${sample.relation} [${sample.status}]`);
});

db.close();

console.log('\n✅ Import complete! Your Google Sheets data has been restored to the database.');
console.log('\n💡 The application should now show your actual samples.');