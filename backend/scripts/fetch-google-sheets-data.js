#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function fetchGoogleSheetsData() {
    try {
        console.log('🔍 Fetching data from Google Sheets...\n');
        
        // Load credentials
        const credentialsPath = path.join(__dirname, '../config/credentials.json');
        if (!fs.existsSync(credentialsPath)) {
            console.error('❌ Google credentials not found at:', credentialsPath);
            console.log('\n📋 Your Google Sheets IDs:');
            console.log('Main Spreadsheet: https://docs.google.com/spreadsheets/d/' + process.env.MAIN_SPREADSHEET_ID);
            console.log('Batch Spreadsheet: https://docs.google.com/spreadsheets/d/' + process.env.BATCH_SPREADSHEET_ID);
            console.log('\n⚠️  Please check these spreadsheets manually in your browser!');
            return;
        }

        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Fetch from Main Spreadsheet
        console.log('📊 Fetching from Main Spreadsheet...');
        const mainResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
            range: 'A:Z', // Get all columns
        });

        if (mainResponse.data.values && mainResponse.data.values.length > 0) {
            console.log(`✅ Found ${mainResponse.data.values.length - 1} rows in Main Spreadsheet`);
            
            // Save to file
            const mainData = mainResponse.data.values;
            fs.writeFileSync(
                path.join(__dirname, '../data-recovery-backup/google-sheets-main.json'),
                JSON.stringify(mainData, null, 2)
            );
            
            // Show sample of data
            console.log('\n📋 Sample of Main Spreadsheet data:');
            console.log('Headers:', mainData[0]);
            for (let i = 1; i < Math.min(6, mainData.length); i++) {
                console.log(`Row ${i}:`, mainData[i].slice(0, 5).join(' | '));
            }
        }

        // Fetch from Batch Spreadsheet
        console.log('\n📊 Fetching from Batch Spreadsheet...');
        const batchResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.BATCH_SPREADSHEET_ID,
            range: 'A:Z', // Get all columns
        });

        if (batchResponse.data.values && batchResponse.data.values.length > 0) {
            console.log(`✅ Found ${batchResponse.data.values.length - 1} rows in Batch Spreadsheet`);
            
            // Save to file
            const batchData = batchResponse.data.values;
            fs.writeFileSync(
                path.join(__dirname, '../data-recovery-backup/google-sheets-batch.json'),
                JSON.stringify(batchData, null, 2)
            );
            
            // Show sample of data
            console.log('\n📋 Sample of Batch Spreadsheet data:');
            console.log('Headers:', batchData[0]);
            for (let i = 1; i < Math.min(6, batchData.length); i++) {
                console.log(`Row ${i}:`, batchData[i].slice(0, 5).join(' | '));
            }
        }

        console.log('\n✅ Data saved to backend/data-recovery-backup/');
        console.log('\n🔗 Direct links to your Google Sheets:');
        console.log('Main: https://docs.google.com/spreadsheets/d/' + process.env.MAIN_SPREADSHEET_ID);
        console.log('Batch: https://docs.google.com/spreadsheets/d/' + process.env.BATCH_SPREADSHEET_ID);

    } catch (error) {
        console.error('❌ Error fetching Google Sheets data:', error.message);
        console.log('\n📋 Your Google Sheets IDs:');
        console.log('Main Spreadsheet: https://docs.google.com/spreadsheets/d/' + process.env.MAIN_SPREADSHEET_ID);
        console.log('Batch Spreadsheet: https://docs.google.com/spreadsheets/d/' + process.env.BATCH_SPREADSHEET_ID);
        console.log('\n⚠️  Please check these spreadsheets manually in your browser!');
    }
}

fetchGoogleSheetsData();