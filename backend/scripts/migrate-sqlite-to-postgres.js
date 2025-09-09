#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script
 * Migrates all data from ashley_lims.db to jagdna_lims PostgreSQL database
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_PATH = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const PG_CONFIG = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'jagdna_lims',
    user: process.env.POSTGRES_USER || 'lims_user',
    password: process.env.POSTGRES_PASSWORD || 'secure_password_2024',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

class DatabaseMigrator {
    constructor() {
        this.sqlite = null;
        this.pgPool = null;
        this.stats = {
            users: 0,
            test_cases: 0,
            samples: 0,
            batches: 0,
            extraction_batches: 0,
            well_assignments: 0,
            quality_control: 0,
            equipment: 0,
            reports: 0,
            workflow_stage_configs: 0,
            sample_workflow_timing: 0,
            workflow_cycles: 0,
            osiris_analyses: 0,
            errors: []
        };
    }

    async initialize() {
        console.log('🔄 Initializing migration...');
        
        // Connect to SQLite
        if (!fs.existsSync(SQLITE_PATH)) {
            throw new Error(`SQLite database not found: ${SQLITE_PATH}`);
        }
        this.sqlite = new Database(SQLITE_PATH, { readonly: true });
        console.log('✅ Connected to SQLite database');

        // Connect to PostgreSQL
        this.pgPool = new Pool(PG_CONFIG);
        const client = await this.pgPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log(`✅ Connected to PostgreSQL database: ${result.rows[0].now}`);
    }

    async migrateUsers() {
        console.log('📊 Migrating users...');
        
        try {
            const users = this.sqlite.prepare('SELECT * FROM users').all();
            console.log(`Found ${users.length} users to migrate`);

            for (const user of users) {
                await this.pgPool.query(`
                    INSERT INTO users (
                        id, username, email, password_hash, role, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (username) DO UPDATE SET
                        email = EXCLUDED.email,
                        password_hash = EXCLUDED.password_hash,
                        role = EXCLUDED.role,
                        updated_at = EXCLUDED.updated_at
                `, [
                    user.id, user.username, user.email, user.password_hash,
                    user.role, user.created_at, user.updated_at
                ]);
            }

            // Update sequence
            if (users.length > 0) {
                const maxId = Math.max(...users.map(u => u.id));
                await this.pgPool.query(`SELECT setval('users_id_seq', $1, true)`, [maxId]);
            }

            this.stats.users = users.length;
            console.log(`✅ Migrated ${users.length} users`);
        } catch (error) {
            console.error('❌ Error migrating users:', error.message);
            this.stats.errors.push(`Users: ${error.message}`);
        }
    }

    async migrateTestCases() {
        console.log('📊 Migrating test cases...');
        
        try {
            const testCases = this.sqlite.prepare('SELECT * FROM test_cases').all();
            console.log(`Found ${testCases.length} test cases to migrate`);

            for (const testCase of testCases) {
                await this.pgPool.query(`
                    INSERT INTO test_cases (
                        id, case_number, ref_kit_number, submission_date, client_type,
                        mother_present, email_contact, phone_contact, address_area, comments,
                        test_purpose, sample_type, authorized_collector, consent_type,
                        has_signatures, has_witness, witness_name, legal_declarations,
                        status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                    ON CONFLICT (case_number) DO UPDATE SET
                        ref_kit_number = EXCLUDED.ref_kit_number,
                        submission_date = EXCLUDED.submission_date,
                        client_type = EXCLUDED.client_type,
                        updated_at = EXCLUDED.updated_at
                `, [
                    testCase.id, testCase.case_number, testCase.ref_kit_number,
                    testCase.submission_date, testCase.client_type, testCase.mother_present,
                    testCase.email_contact, testCase.phone_contact, testCase.address_area,
                    testCase.comments, testCase.test_purpose, testCase.sample_type,
                    testCase.authorized_collector, testCase.consent_type, testCase.has_signatures,
                    testCase.has_witness, testCase.witness_name, testCase.legal_declarations,
                    testCase.status, testCase.created_at, testCase.updated_at
                ]);
            }

            // Update sequence
            if (testCases.length > 0) {
                const maxId = Math.max(...testCases.map(tc => tc.id));
                await this.pgPool.query(`SELECT setval('test_cases_id_seq', $1, true)`, [maxId]);
            }

            this.stats.test_cases = testCases.length;
            console.log(`✅ Migrated ${testCases.length} test cases`);
        } catch (error) {
            console.error('❌ Error migrating test cases:', error.message);
            this.stats.errors.push(`Test cases: ${error.message}`);
        }
    }

    async migrateSamples() {
        console.log('📊 Migrating samples...');
        
        try {
            const samples = this.sqlite.prepare('SELECT * FROM samples ORDER BY id').all();
            console.log(`Found ${samples.length} samples to migrate`);

            const batchSize = 100;
            let migrated = 0;

            for (let i = 0; i < samples.length; i += batchSize) {
                const batch = samples.slice(i, i + batchSize);
                
                for (const sample of batch) {
                    try {
                        await this.pgPool.query(`
                            INSERT INTO samples (
                                id, case_id, lab_number, name, surname, id_dob, date_of_birth,
                                place_of_birth, nationality, occupation, address, phone_number,
                                email, id_number, id_type, marital_status, ethnicity,
                                collection_date, submission_date, relation, additional_notes,
                                batch_id, extraction_id, kit_batch_number, lab_batch_number,
                                report_number, report_sent, status, workflow_status, case_number,
                                gender, age, sample_type, notes, is_real_data, created_at, updated_at
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                                $29, $30, $31, $32, $33, $34, $35, $36, $37
                            )
                            ON CONFLICT (lab_number) DO UPDATE SET
                                name = EXCLUDED.name,
                                surname = EXCLUDED.surname,
                                workflow_status = EXCLUDED.workflow_status,
                                status = EXCLUDED.status,
                                updated_at = EXCLUDED.updated_at
                        `, [
                            sample.id, sample.case_id, sample.lab_number, sample.name, sample.surname,
                            sample.id_dob, sample.date_of_birth, sample.place_of_birth,
                            sample.nationality, sample.occupation, sample.address, sample.phone_number,
                            sample.email, sample.id_number, sample.id_type, sample.marital_status,
                            sample.ethnicity, sample.collection_date, sample.submission_date,
                            sample.relation, sample.additional_notes, sample.batch_id, sample.extraction_id,
                            sample.kit_batch_number, sample.lab_batch_number, sample.report_number,
                            sample.report_sent, sample.status, sample.workflow_status,
                            sample.case_number, sample.gender, sample.age, sample.sample_type,
                            sample.notes, sample.is_real_data !== undefined ? sample.is_real_data : true,
                            sample.created_at, sample.updated_at
                        ]);
                        migrated++;
                    } catch (error) {
                        console.warn(`⚠️  Sample ${sample.lab_number}: ${error.message}`);
                    }
                }

                if (i % 500 === 0) {
                    console.log(`   Migrated ${migrated}/${samples.length} samples...`);
                }
            }

            // Update sequence
            if (samples.length > 0) {
                const maxId = Math.max(...samples.map(s => s.id));
                await this.pgPool.query(`SELECT setval('samples_id_seq', $1, true)`, [maxId]);
            }

            this.stats.samples = migrated;
            console.log(`✅ Migrated ${migrated} samples`);
        } catch (error) {
            console.error('❌ Error migrating samples:', error.message);
            this.stats.errors.push(`Samples: ${error.message}`);
        }
    }

    async migrateBatches() {
        console.log('📊 Migrating batches...');
        
        try {
            const batches = this.sqlite.prepare('SELECT * FROM batches').all();
            console.log(`Found ${batches.length} batches to migrate`);

            for (const batch of batches) {
                await this.pgPool.query(`
                    INSERT INTO batches (
                        id, batch_number, operator, pcr_date, electro_date, settings,
                        total_samples, plate_layout, status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (batch_number) DO UPDATE SET
                        operator = EXCLUDED.operator,
                        total_samples = EXCLUDED.total_samples,
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at
                `, [
                    batch.id, batch.batch_number, batch.operator, batch.pcr_date,
                    batch.electro_date, batch.settings, batch.total_samples,
                    batch.plate_layout, batch.status, batch.created_at, batch.updated_at
                ]);
            }

            // Update sequence
            if (batches.length > 0) {
                const maxId = Math.max(...batches.map(b => b.id));
                await this.pgPool.query(`SELECT setval('batches_id_seq', $1, true)`, [maxId]);
            }

            this.stats.batches = batches.length;
            console.log(`✅ Migrated ${batches.length} batches`);
        } catch (error) {
            console.error('❌ Error migrating batches:', error.message);
            this.stats.errors.push(`Batches: ${error.message}`);
        }
    }

    async migrateOptionalTables() {
        console.log('📊 Migrating optional tables...');

        // Migrate well assignments if exists
        try {
            const wellAssignments = this.sqlite.prepare('SELECT * FROM well_assignments').all();
            if (wellAssignments.length > 0) {
                console.log(`   Migrating ${wellAssignments.length} well assignments`);
                for (const wa of wellAssignments) {
                    await this.pgPool.query(`
                        INSERT INTO well_assignments (
                            id, batch_id, well_position, sample_id, well_type,
                            kit_number, sample_name, comment, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (batch_id, well_position) DO UPDATE SET
                            sample_id = EXCLUDED.sample_id,
                            well_type = EXCLUDED.well_type
                    `, [
                        wa.id, wa.batch_id, wa.well_position, wa.sample_id, wa.well_type,
                        wa.kit_number, wa.sample_name, wa.comment, wa.created_at
                    ]);
                }
                this.stats.well_assignments = wellAssignments.length;
            }
        } catch (error) {
            console.log('   No well_assignments table or empty');
        }

        // Migrate quality control if exists
        try {
            const qcRecords = this.sqlite.prepare('SELECT * FROM quality_control').all();
            if (qcRecords.length > 0) {
                console.log(`   Migrating ${qcRecords.length} quality control records`);
                for (const qc of qcRecords) {
                    await this.pgPool.query(`
                        INSERT INTO quality_control (
                            id, batch_id, date, control_type, result, operator, comments, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        qc.id, qc.batch_id, qc.date, qc.control_type, qc.result,
                        qc.operator, qc.comments, qc.created_at
                    ]);
                }
                this.stats.quality_control = qcRecords.length;
            }
        } catch (error) {
            console.log('   No quality_control table or empty');
        }

        // Migrate equipment if exists
        try {
            const equipment = this.sqlite.prepare('SELECT * FROM equipment').all();
            if (equipment.length > 0) {
                console.log(`   Migrating ${equipment.length} equipment records`);
                for (const eq of equipment) {
                    await this.pgPool.query(`
                        INSERT INTO equipment (
                            id, equipment_id, type, last_calibration, next_calibration, 
                            status, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (equipment_id) DO UPDATE SET
                            type = EXCLUDED.type,
                            last_calibration = EXCLUDED.last_calibration,
                            next_calibration = EXCLUDED.next_calibration,
                            status = EXCLUDED.status
                    `, [
                        eq.id, eq.equipment_id, eq.type, eq.last_calibration,
                        eq.next_calibration, eq.status, eq.created_at, eq.updated_at
                    ]);
                }
                this.stats.equipment = equipment.length;
            }
        } catch (error) {
            console.log('   No equipment table or empty');
        }

        // Migrate workflow stage configs if exists
        try {
            const stageConfigs = this.sqlite.prepare('SELECT * FROM workflow_stage_configs').all();
            if (stageConfigs.length > 0) {
                console.log(`   Migrating ${stageConfigs.length} workflow stage configs`);
                for (const config of stageConfigs) {
                    await this.pgPool.query(`
                        INSERT INTO workflow_stage_configs (
                            id, stage_name, duration_minutes, is_active, description,
                            created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (stage_name) DO UPDATE SET
                            duration_minutes = EXCLUDED.duration_minutes,
                            is_active = EXCLUDED.is_active,
                            description = EXCLUDED.description,
                            updated_at = EXCLUDED.updated_at
                    `, [
                        config.id, config.stage_name, config.duration_minutes,
                        config.is_active, config.description, config.created_at, config.updated_at
                    ]);
                }
                this.stats.workflow_stage_configs = stageConfigs.length;
            }
        } catch (error) {
            console.log('   No workflow_stage_configs table or empty');
        }

        // Migrate sample workflow timing if exists
        try {
            const workflowTiming = this.sqlite.prepare('SELECT * FROM sample_workflow_timing').all();
            if (workflowTiming.length > 0) {
                console.log(`   Migrating ${workflowTiming.length} workflow timing records`);
                for (const timing of workflowTiming) {
                    await this.pgPool.query(`
                        INSERT INTO sample_workflow_timing (
                            id, sample_id, stage_name, entry_time, exit_time, 
                            duration_seconds, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        timing.id, timing.sample_id, timing.stage_name,
                        timing.entry_time, timing.exit_time, timing.duration_seconds,
                        timing.created_at
                    ]);
                }
                this.stats.sample_workflow_timing = workflowTiming.length;
            }
        } catch (error) {
            console.log('   No sample_workflow_timing table or empty');
        }

        // Migrate OSIRIS analyses if exists
        try {
            const osirisAnalyses = this.sqlite.prepare('SELECT * FROM osiris_analyses').all();
            if (osirisAnalyses.length > 0) {
                console.log(`   Migrating ${osirisAnalyses.length} OSIRIS analyses`);
                for (const analysis of osirisAnalyses) {
                    await this.pgPool.query(`
                        INSERT INTO osiris_analyses (
                            id, case_id, input_directory, output_directory, kit_name,
                            status, started_at, completed_at, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        analysis.id, analysis.case_id, analysis.input_directory,
                        analysis.output_directory, analysis.kit_name, analysis.status,
                        analysis.started_at, analysis.completed_at, analysis.created_at
                    ]);
                }
                this.stats.osiris_analyses = osirisAnalyses.length;
            }
        } catch (error) {
            console.log('   No osiris_analyses table or empty');
        }
    }

    async validateMigration() {
        console.log('🔍 Validating migration...');
        
        const validation = {};

        // Count records in PostgreSQL
        const pgCounts = await this.pgPool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM test_cases) as test_cases,
                (SELECT COUNT(*) FROM samples) as samples,
                (SELECT COUNT(*) FROM batches) as batches,
                (SELECT COUNT(*) FROM well_assignments) as well_assignments,
                (SELECT COUNT(*) FROM quality_control) as quality_control,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM workflow_stage_configs) as workflow_stage_configs,
                (SELECT COUNT(*) FROM sample_workflow_timing) as sample_workflow_timing,
                (SELECT COUNT(*) FROM osiris_analyses) as osiris_analyses
        `);

        const pgData = pgCounts.rows[0];
        
        // Count records in SQLite
        const sqliteCounts = {
            users: this.getSQLiteCount('users'),
            test_cases: this.getSQLiteCount('test_cases'),
            samples: this.getSQLiteCount('samples'),
            batches: this.getSQLiteCount('batches'),
            well_assignments: this.getSQLiteCount('well_assignments'),
            quality_control: this.getSQLiteCount('quality_control'),
            equipment: this.getSQLiteCount('equipment'),
            workflow_stage_configs: this.getSQLiteCount('workflow_stage_configs'),
            sample_workflow_timing: this.getSQLiteCount('sample_workflow_timing'),
            osiris_analyses: this.getSQLiteCount('osiris_analyses')
        };

        console.log('\n📊 Migration Validation:');
        console.log('Table                    | SQLite | PostgreSQL | Status');
        console.log('-------------------------|--------|------------|-------');
        
        for (const [table, sqliteCount] of Object.entries(sqliteCounts)) {
            const pgCount = parseInt(pgData[table] || 0);
            const status = pgCount >= sqliteCount ? '✅' : '❌';
            console.log(`${table.padEnd(24)} | ${sqliteCount.toString().padStart(6)} | ${pgCount.toString().padStart(10)} | ${status}`);
            validation[table] = { sqlite: sqliteCount, postgres: pgCount, valid: pgCount >= sqliteCount };
        }

        return validation;
    }

    getSQLiteCount(tableName) {
        try {
            const result = this.sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
            return result.count;
        } catch (error) {
            return 0;
        }
    }

    async run() {
        try {
            console.log('🚀 Starting SQLite to PostgreSQL migration...');
            console.log(`📁 SQLite database: ${SQLITE_PATH}`);
            console.log(`🐘 PostgreSQL: ${PG_CONFIG.user}@${PG_CONFIG.host}:${PG_CONFIG.port}/${PG_CONFIG.database}\n`);

            await this.initialize();

            // Migrate core tables
            await this.migrateUsers();
            await this.migrateTestCases();
            await this.migrateSamples();
            await this.migrateBatches();
            
            // Migrate optional tables
            await this.migrateOptionalTables();

            // Validate migration
            const validation = await this.validateMigration();

            console.log('\n🎉 Migration completed!');
            console.log(`📈 Total records migrated: ${Object.values(this.stats).reduce((a, b) => typeof b === 'number' ? a + b : a, 0)}`);
            
            if (this.stats.errors.length > 0) {
                console.log('\n⚠️  Errors encountered:');
                this.stats.errors.forEach(error => console.log(`   - ${error}`));
            }

            return { success: true, stats: this.stats, validation };

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            return { success: false, error: error.message };
        } finally {
            if (this.sqlite) this.sqlite.close();
            if (this.pgPool) await this.pgPool.end();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    migrator.run()
        .then(result => {
            if (result.success) {
                console.log('✅ Migration completed successfully');
                process.exit(0);
            } else {
                console.error('❌ Migration failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Migration error:', error);
            process.exit(1);
        });
}

module.exports = DatabaseMigrator;