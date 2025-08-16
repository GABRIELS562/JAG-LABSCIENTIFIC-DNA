const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

// Check if columns exist and add them if they don't
const columns = [
  { name: 'test_purpose', type: 'TEXT', default: "'peace_of_mind'" },
  { name: 'client_type', type: 'TEXT', default: "'paternity'" },
  { name: 'urgent', type: 'INTEGER', default: '0' },
  { name: 'case_id', type: 'INTEGER', default: 'NULL' },
  { name: 'submission_date', type: 'DATE', default: 'NULL' },
  { name: 'sample_type', type: 'TEXT', default: "'buccal_swab'" },
  { name: 'gender', type: 'TEXT', default: "'M'" }
];

columns.forEach(column => {
  try {
    // Check if column exists
    const tableInfo = db.pragma(`table_info(samples)`);
    const columnExists = tableInfo.some(col => col.name === column.name);
    
    if (!columnExists) {
      const sql = `ALTER TABLE samples ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`;
      db.exec(sql);
      } else {
      }
  } catch (error) {
    }
});

// Update existing samples with default values if needed
try {
  db.exec(`
    UPDATE samples 
    SET test_purpose = 'peace_of_mind' 
    WHERE test_purpose IS NULL
  `);
  
  db.exec(`
    UPDATE samples 
    SET client_type = 'paternity' 
    WHERE client_type IS NULL
  `);
  
  db.exec(`
    UPDATE samples 
    SET urgent = 0 
    WHERE urgent IS NULL
  `);
  
  } catch (error) {
  }

db.close();
