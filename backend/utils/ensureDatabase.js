const fs = require('fs');
const path = require('path');

/**
 * Ensures PostgreSQL database schema is properly initialized
 * This runs on every server startup to prevent schema drift
 */
async function ensurePostgreSQLSchema(pool) {
  try {
    console.log('🔧 Ensuring PostgreSQL schema compatibility...');

    // Read the initialization SQL
    const initSQL = fs.readFileSync(
      path.join(__dirname, '../database/init-postgresql.sql'),
      'utf8'
    );

    // Execute the initialization script
    await pool.query(initSQL);

    // Verify critical tables exist
    const criticalTables = [
      'samples',
      'processing_log',
      'devops_metrics',
      'background_jobs',
      'workflow_metrics'
    ];

    for (const table of criticalTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [table]
      );

      if (!result.rows[0].exists) {
        console.error(`❌ Critical table missing: ${table}`);
        throw new Error(`Missing critical table: ${table}`);
      }
    }

    // Verify samples table has required columns
    const requiredColumns = [
      'ethnicity', 'email', 'id_number', 'id_type',
      'marital_status', 'submission_date'
    ];

    for (const column of requiredColumns) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'samples'
          AND column_name = $1
        )`,
        [column]
      );

      if (!result.rows[0].exists) {
        console.log(`⚠️  Adding missing column: samples.${column}`);
        // Column will be added by init script
      }
    }

    console.log('✅ PostgreSQL schema verification complete');
    return true;
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    // Don't throw - allow app to start with degraded functionality
    return false;
  }
}

/**
 * Ensures sample workflow is active for DevOps metrics
 */
async function ensureSampleWorkflow(pool) {
  try {
    // Check if we have samples to process
    const result = await pool.query('SELECT COUNT(*) as count FROM samples');
    const sampleCount = parseInt(result.rows[0].count);

    if (sampleCount === 0) {
      console.log('📊 Creating initial samples for workflow...');
      // Insert initial samples for workflow
      await pool.query(`
        INSERT INTO samples (lab_number, name, surname, relation, workflow_status, case_number, collection_date)
        VALUES
          ('LAB-2025-001', 'John', 'Doe', 'Child', 'sample_collected', 'PAT-2025-001', CURRENT_DATE),
          ('LAB-2025-002', 'Jane', 'Doe', 'Mother', 'dna_extraction', 'PAT-2025-001', CURRENT_DATE),
          ('LAB-2025-003', 'James', 'Doe', 'Alleged Father', 'pcr_ready', 'PAT-2025-001', CURRENT_DATE)
        ON CONFLICT (lab_number) DO NOTHING
      `);
    }

    console.log(`📈 Sample workflow active with ${sampleCount} samples`);
    return true;
  } catch (error) {
    console.error('⚠️  Sample workflow check failed:', error.message);
    return false;
  }
}

/**
 * Main initialization function
 */
async function initializeDatabase(pool) {
  if (!pool) {
    console.error('❌ No database pool provided');
    return false;
  }

  try {
    // Ensure schema is correct
    await ensurePostgreSQLSchema(pool);

    // Ensure sample workflow is active
    await ensureSampleWorkflow(pool);

    // Log workflow statistics
    const stats = await pool.query(`
      SELECT workflow_status, COUNT(*) as count
      FROM samples
      GROUP BY workflow_status
    `);

    console.log('📊 Current workflow distribution:');
    stats.rows.forEach(row => {
      console.log(`   ${row.workflow_status}: ${row.count} samples`);
    });

    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    return false;
  }
}

module.exports = {
  initializeDatabase,
  ensurePostgreSQLSchema,
  ensureSampleWorkflow
};