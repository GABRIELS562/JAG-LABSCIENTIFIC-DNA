#!/usr/bin/env node

// Database Migration Manager for LIMS Application
// This script provides comprehensive database migration management

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const readline = require('readline');

// Configuration
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lims_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  directories: {
    migrations: path.join(__dirname, 'migrations'),
    seeds: path.join(__dirname, 'seeds'),
    backups: path.join(__dirname, 'backups')
  },
  environments: ['development', 'staging', 'production']
};

// Color definitions for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Logging functions
const log = {
  info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warning: (message) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  debug: (message) => {
    if (process.env.DEBUG === 'true') {
      console.log(`${colors.magenta}[DEBUG]${colors.reset} ${message}`);
    }
  }
};

class DatabaseManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Client(config.database);
      await this.client.connect();
      this.isConnected = true;
      log.success('Connected to database');
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.end();
      this.isConnected = false;
      log.info('Database connection closed');
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.client.query(sql, params);
      return result;
    } catch (error) {
      log.error(`Query failed: ${error.message}`);
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.query('BEGIN');
      const result = await callback();
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }
}

class MigrationManager {
  constructor(dbManager) {
    this.db = dbManager;
    this.migrationsDir = config.directories.migrations;
    this.seedsDir = config.directories.seeds;
    this.backupsDir = config.directories.backups;
  }

  async initialize() {
    try {
      // Create migrations tracking table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(50) PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          applied_by VARCHAR(50) DEFAULT 'system',
          checksum VARCHAR(64),
          rollback_sql TEXT
        )
      `);

      // Create backup directory if it doesn't exist
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      }

      log.success('Migration system initialized');
    } catch (error) {
      log.error(`Migration system initialization failed: ${error.message}`);
      throw error;
    }
  }

  async getPendingMigrations() {
    try {
      // Get all migration files
      const migrationFiles = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Get applied migrations
      const appliedResult = await this.db.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      const appliedMigrations = appliedResult.rows.map(row => row.version);

      // Find pending migrations
      const pendingMigrations = migrationFiles
        .map(file => path.basename(file, '.sql'))
        .filter(version => !appliedMigrations.includes(version));

      return pendingMigrations;
    } catch (error) {
      log.error(`Failed to get pending migrations: ${error.message}`);
      throw error;
    }
  }

  async getAppliedMigrations() {
    try {
      const result = await this.db.query(
        'SELECT version, description, applied_at, applied_by FROM schema_migrations ORDER BY applied_at DESC'
      );
      return result.rows;
    } catch (error) {
      log.error(`Failed to get applied migrations: ${error.message}`);
      throw error;
    }
  }

  calculateChecksum(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async validateMigration(version) {
    try {
      const migrationFile = path.join(this.migrationsDir, `${version}.sql`);
      
      if (!fs.existsSync(migrationFile)) {
        throw new Error(`Migration file not found: ${migrationFile}`);
      }

      const content = fs.readFileSync(migrationFile, 'utf8');
      const checksum = this.calculateChecksum(content);

      // Check if migration was already applied
      const result = await this.db.query(
        'SELECT checksum FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (result.rows.length > 0) {
        const storedChecksum = result.rows[0].checksum;
        if (storedChecksum && storedChecksum !== checksum) {
          throw new Error(`Migration ${version} has been modified since it was applied`);
        }
      }

      return { content, checksum };
    } catch (error) {
      log.error(`Migration validation failed: ${error.message}`);
      throw error;
    }
  }

  async applyMigration(version, dryRun = false) {
    try {
      log.info(`${dryRun ? 'Dry run: ' : ''}Applying migration ${version}...`);

      const { content, checksum } = await this.validateMigration(version);
      
      if (dryRun) {
        log.info('Dry run: Migration would be executed successfully');
        return;
      }

      // Create backup before applying migration
      await this.createBackup(`pre_migration_${version}`);

      // Apply migration in transaction
      await this.db.transaction(async () => {
        // Execute migration SQL
        await this.db.query(content);

        // Extract description from migration content
        const descriptionMatch = content.match(/-- Description: (.+)/);
        const description = descriptionMatch ? descriptionMatch[1] : `Migration ${version}`;

        // Record migration
        await this.db.query(
          `INSERT INTO schema_migrations (version, description, checksum) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (version) DO UPDATE SET 
             applied_at = CURRENT_TIMESTAMP,
             checksum = EXCLUDED.checksum`,
          [version, description, checksum]
        );
      });

      log.success(`Migration ${version} applied successfully`);
    } catch (error) {
      log.error(`Failed to apply migration ${version}: ${error.message}`);
      throw error;
    }
  }

  async rollbackMigration(version) {
    try {
      log.warning(`Rolling back migration ${version}...`);

      // Check if migration exists
      const result = await this.db.query(
        'SELECT rollback_sql FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (result.rows.length === 0) {
        throw new Error(`Migration ${version} not found in applied migrations`);
      }

      const rollbackSql = result.rows[0].rollback_sql;
      
      if (!rollbackSql) {
        throw new Error(`No rollback script available for migration ${version}`);
      }

      // Create backup before rollback
      await this.createBackup(`pre_rollback_${version}`);

      // Execute rollback in transaction
      await this.db.transaction(async () => {
        await this.db.query(rollbackSql);
        await this.db.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
      });

      log.success(`Migration ${version} rolled back successfully`);
    } catch (error) {
      log.error(`Failed to rollback migration ${version}: ${error.message}`);
      throw error;
    }
  }

  async runMigrations(targetVersion = null, dryRun = false) {
    try {
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        log.info('No pending migrations to apply');
        return;
      }

      let migrationsToApply = pendingMigrations;
      
      if (targetVersion) {
        const targetIndex = pendingMigrations.indexOf(targetVersion);
        if (targetIndex === -1) {
          throw new Error(`Target migration ${targetVersion} not found in pending migrations`);
        }
        migrationsToApply = pendingMigrations.slice(0, targetIndex + 1);
      }

      log.info(`${dryRun ? 'Dry run: ' : ''}Found ${migrationsToApply.length} migration(s) to apply`);

      for (const version of migrationsToApply) {
        await this.applyMigration(version, dryRun);
      }

      log.success(`${dryRun ? 'Dry run: ' : ''}All migrations applied successfully`);
    } catch (error) {
      log.error(`Migration run failed: ${error.message}`);
      throw error;
    }
  }

  async createBackup(label = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupLabel = label || `backup_${timestamp}`;
      const backupFile = path.join(this.backupsDir, `${backupLabel}.sql`);

      const dumpCommand = `pg_dump -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d ${config.database.database} -f ${backupFile}`;
      
      log.info(`Creating database backup: ${backupFile}`);
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync(dumpCommand, {
        env: { ...process.env, PGPASSWORD: config.database.password }
      });

      log.success(`Database backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      log.error(`Database backup failed: ${error.message}`);
      throw error;
    }
  }

  async restoreBackup(backupFile) {
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      log.warning(`Restoring database from backup: ${backupFile}`);
      
      const restoreCommand = `psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d ${config.database.database} -f ${backupFile}`;
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync(restoreCommand, {
        env: { ...process.env, PGPASSWORD: config.database.password }
      });

      log.success(`Database restored from backup: ${backupFile}`);
    } catch (error) {
      log.error(`Database restore failed: ${error.message}`);
      throw error;
    }
  }

  async seedDatabase(environment = 'development') {
    try {
      if (!config.environments.includes(environment)) {
        throw new Error(`Invalid environment: ${environment}`);
      }

      const seedDir = path.join(this.seedsDir, environment);
      
      if (!fs.existsSync(seedDir)) {
        log.warning(`No seed directory found for environment: ${environment}`);
        return;
      }

      const seedFiles = fs.readdirSync(seedDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (seedFiles.length === 0) {
        log.info(`No seed files found for environment: ${environment}`);
        return;
      }

      log.info(`Seeding database for environment: ${environment}`);
      
      for (const seedFile of seedFiles) {
        const seedPath = path.join(seedDir, seedFile);
        const seedContent = fs.readFileSync(seedPath, 'utf8');
        
        log.info(`Executing seed file: ${seedFile}`);
        await this.db.query(seedContent);
      }

      log.success(`Database seeded successfully for environment: ${environment}`);
    } catch (error) {
      log.error(`Database seeding failed: ${error.message}`);
      throw error;
    }
  }

  async checkMigrationStatus() {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const pendingMigrations = await this.getPendingMigrations();

      console.log('\n=== Migration Status ===');
      console.log(`Applied migrations: ${appliedMigrations.length}`);
      console.log(`Pending migrations: ${pendingMigrations.length}`);

      if (appliedMigrations.length > 0) {
        console.log('\n--- Applied Migrations ---');
        appliedMigrations.forEach(migration => {
          console.log(`✓ ${migration.version}: ${migration.description} (${migration.applied_at})`);
        });
      }

      if (pendingMigrations.length > 0) {
        console.log('\n--- Pending Migrations ---');
        pendingMigrations.forEach(version => {
          console.log(`⏳ ${version}`);
        });
      }

      console.log('\n');
    } catch (error) {
      log.error(`Failed to check migration status: ${error.message}`);
      throw error;
    }
  }

  async createMigration(name, description) {
    try {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const counter = String(Date.now()).slice(-3);
      const version = `${timestamp}_${counter}`;
      const filename = `${version}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
      const filePath = path.join(this.migrationsDir, filename);

      const migrationTemplate = `-- Migration: ${filename}
-- Description: ${description}
-- Author: ${process.env.USER || 'system'}
-- Date: ${new Date().toISOString().slice(0, 10)}
-- Version: ${version}

-- Add your migration SQL here
BEGIN;

-- Example: CREATE TABLE example_table (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- Record this migration
INSERT INTO schema_migrations (version, description, checksum) VALUES 
('${version}', '${description}', md5('${filename}'));

COMMIT;
`;

      fs.writeFileSync(filePath, migrationTemplate);
      log.success(`Created migration file: ${filePath}`);
    } catch (error) {
      log.error(`Failed to create migration: ${error.message}`);
      throw error;
    }
  }
}

// CLI Interface
class CLI {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.migrationManager = new MigrationManager(this.dbManager);
  }

  async run() {
    try {
      await this.dbManager.connect();
      await this.migrationManager.initialize();

      const command = process.argv[2];
      const args = process.argv.slice(3);

      switch (command) {
        case 'status':
          await this.migrationManager.checkMigrationStatus();
          break;
        
        case 'migrate':
          const targetVersion = args[0];
          const dryRun = args.includes('--dry-run');
          await this.migrationManager.runMigrations(targetVersion, dryRun);
          break;
        
        case 'rollback':
          const rollbackVersion = args[0];
          if (!rollbackVersion) {
            throw new Error('Please specify the migration version to rollback');
          }
          await this.migrationManager.rollbackMigration(rollbackVersion);
          break;
        
        case 'seed':
          const environment = args[0] || 'development';
          await this.migrationManager.seedDatabase(environment);
          break;
        
        case 'backup':
          const backupLabel = args[0];
          await this.migrationManager.createBackup(backupLabel);
          break;
        
        case 'restore':
          const backupFile = args[0];
          if (!backupFile) {
            throw new Error('Please specify the backup file to restore');
          }
          await this.migrationManager.restoreBackup(backupFile);
          break;
        
        case 'create':
          const migrationName = args[0];
          const migrationDesc = args[1] || 'New migration';
          if (!migrationName) {
            throw new Error('Please specify the migration name');
          }
          await this.migrationManager.createMigration(migrationName, migrationDesc);
          break;
        
        default:
          this.showHelp();
      }

    } catch (error) {
      log.error(error.message);
      process.exit(1);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  showHelp() {
    console.log(`
${colors.cyan}LIMS Database Migration Manager${colors.reset}

Usage: node migration-manager.js <command> [options]

Commands:
  status                    Show migration status
  migrate [version]         Apply migrations (optionally up to specific version)
  migrate --dry-run         Preview migrations without applying
  rollback <version>        Rollback a specific migration
  seed [environment]        Seed database (development, staging, production)
  backup [label]           Create database backup
  restore <backup-file>     Restore database from backup
  create <name> [desc]      Create new migration file

Examples:
  node migration-manager.js status
  node migration-manager.js migrate
  node migration-manager.js migrate 001 --dry-run
  node migration-manager.js rollback 002
  node migration-manager.js seed development
  node migration-manager.js backup pre_deployment
  node migration-manager.js create add_user_table "Add users table"

Environment Variables:
  DB_HOST                   Database host (default: localhost)
  DB_PORT                   Database port (default: 5432)
  DB_NAME                   Database name (default: lims_db)
  DB_USER                   Database user (default: postgres)
  DB_PASSWORD               Database password (default: postgres)
  DB_SSL                    Enable SSL (default: false)
  DEBUG                     Enable debug logging (default: false)
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new CLI();
  cli.run().catch(console.error);
}

module.exports = { DatabaseManager, MigrationManager, CLI };