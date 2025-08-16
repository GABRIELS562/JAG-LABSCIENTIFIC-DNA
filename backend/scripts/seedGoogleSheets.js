const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const db = require('../services/database');
const { appendRows, SHEETS, setupSheetStructure } = require('../services/spreadsheets');

async function seedGoogleSheets() {
  try {
    // Skip sheet structure setup for now - assume sheets exist
    // Get all data from SQLite
    const samples = db.getAllSamples();
    const batches = db.getAllBatches();
    const qcRecords = db.getQualityControlRecords();
    const equipment = db.getAllEquipment();
    const testCases = db.getAllTestCases();

    // 1. Populate Main Data Sheet with samples
    const sampleRows = samples.map(sample => [
      sample.lab_number,                    // Lab No
      sample.name,                          // Name
      sample.surname,                       // Surname
      sample.id_dob,                        // ID / DOB
      sample.relation,                      // Relation
      sample.collection_date,               // Sample collection date
      sample.submission_date,               // Submissions Date
      sample.case_id ? 'YES' : 'NO',       // Mother Present YES/NO (approximation)
      sample.email,                         // Email contact
      sample.address,                       // Address Area
      sample.phone_number,                  // Phone contact
      sample.kit_batch_number || '',       // Kit BN
      sample.lab_batch_number || '',       // Lab Batch No.
      sample.report_number || '',          // Report No.
      sample.report_sent || 'NO',          // Report Sent
      sample.additional_notes || ''        // Comment
    ]);

    await appendRows('MAIN', SHEETS.MAIN_DATA.name, sampleRows);
    // 2. Populate Batch Data Sheets
    let batchCount = 0;
    
    for (const batch of batches) {
      try {
        // Add batch header information (PCR date, Electro date, Batch No, Settings)
        const batchHeaderRow = [
          batch.pcr_date || '',
          batch.electro_date || '',
          batch.batch_number,
          batch.settings || '27cycles30minExt'
        ];

        await appendRows('BATCH', SHEETS.BATCH_DATA.name, [batchHeaderRow]);

        // Get well assignments for this batch
        const wellAssignments = db.getWellAssignments(batch.id);
        
        if (wellAssignments.length > 0) {
          // Add well assignment headers
          const wellHeaders = [
            'Well Position', 'Lab No', 'Name', 'Surname', 'ID/DOB', 'Relation', 'Collection Date'
          ];
          await appendRows('BATCH', SHEETS.BATCH_DATA.name, [wellHeaders]);

          // Add well assignment data
          const wellRows = wellAssignments.map(well => [
            well.well_position,
            well.sample_name_full ? `${well.sample_name_full} ${well.surname}` : well.sample_name || '',
            well.sample_name_full || '',
            well.surname || '',
            '', // ID/DOB - would need to join with samples table
            '', // Relation - would need to join with samples table
            '' // Collection Date - would need to join with samples table
          ]);

          await appendRows('BATCH', SHEETS.BATCH_DATA.name, wellRows);
          } else {
          }
        
        batchCount++;
      } catch (error) {
        console.error(`❌ Error adding batch ${batch.batch_number}:`, error.message);
      }
    }

    // 3. Add Quality Control Data (if QC sheet exists)
    try {
      // Create QC data rows
      const qcRows = qcRecords.map(qc => [
        qc.date,
        qc.batch_id?.toString() || '',
        qc.control_type,
        qc.result,
        qc.operator,
        qc.comments || ''
      ]);

      // First add headers
      const qcHeaders = Object.values(SHEETS.QC_DATA.columns);
      await appendRows('MAIN', SHEETS.QC_DATA.name, [qcHeaders]);
      
      // Then add data
      await appendRows('MAIN', SHEETS.QC_DATA.name, qcRows);
      } catch (error) {
      : ${error.message}`);
    }

    // 4. Add Equipment Data (if Equipment sheet exists)
    try {
      // Create equipment data rows
      const equipmentRows = equipment.map(eq => [
        eq.equipment_id,
        eq.type,
        eq.last_calibration || '',
        eq.next_calibration || '',
        eq.status
      ]);

      // First add headers
      const equipmentHeaders = Object.values(SHEETS.EQUIPMENT_DATA.columns);
      await appendRows('MAIN', SHEETS.EQUIPMENT_DATA.name, [equipmentHeaders]);
      
      // Then add data
      await appendRows('MAIN', SHEETS.EQUIPMENT_DATA.name, equipmentRows);
      } catch (error) {
      : ${error.message}`);
    }

    `);
    `);

    return {
      samples: sampleRows.length,
      batches: batchCount,
      qcRecords: qcRecords.length,
      equipment: equipment.length
    };

  } catch (error) {
    console.error('❌ Error seeding Google Sheets:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedGoogleSheets()
    .then((summary) => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Google Sheets seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedGoogleSheets;