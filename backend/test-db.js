const Database = require('better-sqlite3');
const path = require('path');

// Test database connection
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  console.log('✅ Database connected successfully');
  
  // Test query
  const stmt = db.prepare('SELECT COUNT(*) as count FROM samples');
  const result = stmt.get();
  console.log('Sample count:', result.count);
  
  // Test sample fetch
  const sampleStmt = db.prepare('SELECT * FROM samples LIMIT 5');
  const samples = sampleStmt.all();
  console.log('Sample data:', samples);
  
  db.close();
} catch (error) {
  console.error('❌ Database error:', error);
}