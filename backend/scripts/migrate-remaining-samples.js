#!/usr/bin/env node

/**
 * Migrate remaining samples with NULL case_id
 * For samples that don't have corresponding test cases
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const SQLITE_PATH = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const PG_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'jagdna_lims',
    user: 'lims_user',
    password: 'secure_password_2024'
};

async function migrateRemainingSamples() {
    console.log('🔄 Migrating remaining samples with NULL case_id...');
    
    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    const pgPool = new Pool(PG_CONFIG);
    
    try {
        // Get samples that weren't migrated (case_id issues)
        const allSamples = sqlite.prepare('SELECT * FROM samples').all();
        const migratedSamples = await pgPool.query('SELECT lab_number FROM samples');
        const migratedLabNumbers = new Set(migratedSamples.rows.map(row => row.lab_number));
        
        const unmigrated = allSamples.filter(sample => !migratedLabNumbers.has(sample.lab_number));
        console.log(`Found ${unmigrated.length} samples to migrate with NULL case_id`);
        
        let migrated = 0;
        for (const sample of unmigrated) {
            try {
                await pgPool.query(`
                    INSERT INTO samples (
                        id, case_id, lab_number, name, surname, id_dob, date_of_birth,
                        place_of_birth, nationality, occupation, address, phone_number,
                        email, id_number, id_type, marital_status, ethnicity,
                        collection_date, submission_date, relation, additional_notes,
                        batch_id, extraction_id, kit_batch_number, lab_batch_number,
                        report_number, report_sent, status, workflow_status, case_number,
                        gender, age, sample_type, notes, is_real_data, created_at, updated_at
                    ) VALUES (
                        $1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
                        $28, $29, $30, $31, $32, $33, $34, $35, $36
                    )
                `, [
                    sample.id, sample.lab_number, sample.name, sample.surname,
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
        
        // Update the samples sequence
        const maxId = Math.max(...allSamples.map(s => s.id));
        await pgPool.query(`SELECT setval('samples_id_seq', $1, true)`, [maxId]);
        
        console.log(`✅ Migrated ${migrated} additional samples`);
        
        // Final count
        const finalCount = await pgPool.query('SELECT COUNT(*) as count FROM samples');
        console.log(`📊 Total samples in PostgreSQL: ${finalCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        sqlite.close();
        await pgPool.end();
    }
}

migrateRemainingSamples().catch(console.error);