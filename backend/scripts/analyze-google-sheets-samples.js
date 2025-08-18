#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data-recovery-backup/google-sheets-main.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Skip header row
const samples = data.slice(1);

console.log('📊 GOOGLE SHEETS DATA ANALYSIS');
console.log('================================\n');
console.log(`Total rows found: ${samples.length}`);

// Extract lab numbers (first column)
const labNumbers = samples.map(row => row[0]).filter(Boolean);
const uniqueFormats = new Set();
const formatCounts = {};

// Analyze formats
labNumbers.forEach(lab => {
    const format = lab.match(/^([A-Z]*\d{2,4}_)/)?.[1] || lab.split('_')[0] + '_';
    uniqueFormats.add(format);
    formatCounts[format] = (formatCounts[format] || 0) + 1;
});

console.log('\n📋 Sample Format Distribution:');
console.log('--------------------------------');
Object.entries(formatCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([format, count]) => {
        console.log(`${format}XXX: ${count} samples`);
    });

// Show sample data for each format
console.log('\n📝 Sample Data by Format:');
console.log('--------------------------------');

uniqueFormats.forEach(format => {
    console.log(`\n${format}XXX samples:`);
    const formatSamples = samples.filter(row => row[0]?.startsWith(format));
    
    // Show first 3 samples of this format
    formatSamples.slice(0, 3).forEach(row => {
        const [labNo, name, surname, idDob, relation] = row;
        console.log(`  ${labNo}: ${name || '(no name)'} ${surname || '(no surname)'} - ${relation}`);
    });
    
    if (formatSamples.length > 3) {
        console.log(`  ... and ${formatSamples.length - 3} more`);
    }
});

// Check for samples with names/surnames filled
const samplesWithNames = samples.filter(row => row[1] || row[2]);
console.log(`\n📊 Samples with names filled: ${samplesWithNames.length}`);

if (samplesWithNames.length > 0) {
    console.log('\nFirst 5 samples with names:');
    samplesWithNames.slice(0, 5).forEach(row => {
        const [labNo, name, surname, idDob, relation] = row;
        console.log(`  ${labNo}: ${name} ${surname} - ${relation}`);
    });
}

// Save a clean CSV for import
const csvContent = [
    'lab_number,name,surname,id_dob,relation,collection_date,submission_date,kit_number,batch_number,report_number,status,notes',
    ...samples.map(row => {
        const [labNo, name, surname, idDob, relation, collDate, subDate, , , , , kitBn, batchNo, reportNo, , comment] = row;
        return [
            labNo || '',
            name || '',
            surname || '',
            idDob || '',
            relation || '',
            collDate || '',
            subDate || '',
            kitBn || '',
            batchNo || '',
            reportNo || '',
            comment === 'urgent' ? 'urgent' : 'pending',
            comment || ''
        ].map(field => `"${field}"`).join(',');
    })
].join('\n');

fs.writeFileSync(
    path.join(__dirname, '../data-recovery-backup/google-sheets-samples.csv'),
    csvContent
);

console.log('\n✅ Data exported to: backend/data-recovery-backup/google-sheets-samples.csv');
console.log('\n🔗 Your Google Sheets URL:');
console.log('https://docs.google.com/spreadsheets/d/1Z-6iIUL6G5ERIgohoNhZdO79XkfKeeLvoaxeB2rulhY');