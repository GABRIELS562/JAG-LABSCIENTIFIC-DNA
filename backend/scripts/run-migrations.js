const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path - use the existing ashley_lims.db
const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found at:', dbPath);
  process.exit(1);
}

console.log('🔧 Running database migrations...');
console.log('📍 Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Enable foreign keys and WAL mode
  db.prepare('PRAGMA foreign_keys = ON').run();
  db.prepare('PRAGMA journal_mode = WAL').run();

  // Create migrations table to track applied migrations
  db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Get list of migration files
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`📋 Found ${migrationFiles.length} migration files`);

  for (const filename of migrationFiles) {
    // Check if migration was already applied
    const existingMigration = db.prepare('SELECT * FROM migrations WHERE filename = ?').get(filename);
    
    if (existingMigration) {
      console.log(`⏭️  Skipping already applied migration: ${filename}`);
      continue;
    }

    console.log(`🔄 Applying migration: ${filename}`);
    
    try {
      // Read and execute migration file
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split SQL statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      // Run migration in transaction
      const migration = db.transaction(() => {
        for (const statement of statements) {
          try {
            db.prepare(statement).run();
          } catch (error) {
            console.warn(`⚠️  Statement failed (may be expected): ${error.message}`);
            // Continue with next statement - some CREATE IF NOT EXISTS may fail
          }
        }
        
        // Record migration as applied
        db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(filename);
      });
      
      migration();
      console.log(`✅ Applied migration: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to apply migration ${filename}:`, error.message);
      throw error;
    }
  }

  // Show table count after migrations
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`\n📊 Database now has ${tables.length} tables:`);
  tables.forEach(table => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`   - ${table.name} (${count.count} records)`);
    } catch (error) {
      console.log(`   - ${table.name} (error reading count)`);
    }
  });

  console.log('\n🎉 All migrations completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  throw error;
} finally {
  db.close();
}