#!/usr/bin/env node

// Script to add gender column to entire database and randomize M/F for children
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

console.log('🚻 Adding Gender Column to Database and Randomizing Children');
console.log('=' .repeat(60));

function addGenderColumn() {
  console.log('🔧 Adding gender column to samples table...');
  
  try {
    // Check if gender column already exists
    const columns = db.prepare('PRAGMA table_info(samples)').all();
    const hasGenderColumn = columns.some(col => col.name === 'gender');
    
    if (!hasGenderColumn) {
      // Add gender column
      db.prepare('ALTER TABLE samples ADD COLUMN gender TEXT').run();
      console.log('   ✅ Gender column added to samples table');
    } else {
      console.log('   ✅ Gender column already exists');
    }
  } catch (error) {
    console.error('❌ Error adding gender column:', error.message);
    throw error;
  }
}

function updateGenderForAllSamples() {
  console.log('👨👩 Updating gender for all samples...');
  
  try {
    // Get all samples
    const allSamples = db.prepare('SELECT id, relation, lab_number FROM samples').all();
    console.log(`   📊 Found ${allSamples.length} samples to update`);
    
    const updateStmt = db.prepare('UPDATE samples SET gender = ? WHERE id = ?');
    
    let maleCount = 0;
    let femaleCount = 0;
    let childrenUpdated = 0;
    
    const updateTransaction = db.transaction(() => {
      for (const sample of allSamples) {
        let gender;
        
        // Assign gender based on relation
        if (sample.relation === 'alleged_father') {
          gender = 'M';
          maleCount++;
        } else if (sample.relation === 'mother') {
          gender = 'F';
          femaleCount++;
        } else if (sample.relation === 'child') {
          // Randomize gender for children (50/50 chance)
          gender = Math.random() < 0.5 ? 'M' : 'F';
          if (gender === 'M') {
            maleCount++;
          } else {
            femaleCount++;
          }
          childrenUpdated++;
        } else {
          // Default to M for unknown relations
          gender = 'M';
          maleCount++;
        }
        
        updateStmt.run(gender, sample.id);
      }
    });
    
    updateTransaction();
    
    console.log('   ✅ Gender assignment completed:');
    console.log(`      👨 Males: ${maleCount}`);
    console.log(`      👩 Females: ${femaleCount}`);
    console.log(`      🎲 Children randomized: ${childrenUpdated}`);
    
  } catch (error) {
    console.error('❌ Error updating gender:', error.message);
    throw error;
  }
}

function updateChildLabNumbers() {
  console.log('🧬 Updating child lab numbers with father references and gender indicators...');
  
  try {
    // Get all child samples
    const childSamples = db.prepare(`
      SELECT id, lab_number, gender, case_number, case_id 
      FROM samples 
      WHERE relation = 'child' AND case_number IS NOT NULL
    `).all();
    
    console.log(`   👶 Found ${childSamples.length} child samples to update`);
    
    const updateLabNumberStmt = db.prepare('UPDATE samples SET lab_number = ? WHERE id = ?');
    let updatedCount = 0;
    
    const labUpdateTransaction = db.transaction(() => {
      for (const child of childSamples) {
        try {
          // Find the father in the same case
          const father = db.prepare(`
            SELECT lab_number 
            FROM samples 
            WHERE (case_number = ? OR case_id = ?) 
            AND relation = 'alleged_father'
            LIMIT 1
          `).get(child.case_number, child.case_id);
          
          if (father && father.lab_number) {
            // Extract base number from child lab number
            const labMatch = child.lab_number.match(/25_(\\d+)/);
            if (labMatch) {
              const childBaseNumber = labMatch[1];
              const genderIndicator = child.gender === 'F' ? 'F' : 'M';
              
              // Create new lab number format: child(father)Gender
              const newLabNumber = `25_${childBaseNumber}(${father.lab_number})${genderIndicator}`;
              
              updateLabNumberStmt.run(newLabNumber, child.id);
              updatedCount++;
              
              console.log(`      ✅ Updated: ${child.lab_number} → ${newLabNumber}`);
            }
          } else {
            console.log(`      ⚠️  No father found for child: ${child.lab_number} in case ${child.case_number}`);
          }
        } catch (childError) {
          console.warn(`      ⚠️  Error updating child ${child.lab_number}:`, childError.message);
        }
      }
    });
    
    labUpdateTransaction();
    
    console.log(`   ✅ Updated ${updatedCount} child lab numbers with father references and gender`);
    
  } catch (error) {
    console.error('❌ Error updating child lab numbers:', error.message);
    throw error;
  }
}

function generateSummaryReport() {
  console.log('\\n📊 Final Database Summary:');
  console.log('=' .repeat(40));
  
  try {
    // Get gender distribution
    const genderStats = db.prepare(`
      SELECT 
        gender,
        relation,
        COUNT(*) as count
      FROM samples 
      WHERE gender IS NOT NULL
      GROUP BY gender, relation
      ORDER BY relation, gender
    `).all();
    
    // Get total counts
    const totalStats = db.prepare(`
      SELECT 
        COUNT(*) as total_samples,
        COUNT(CASE WHEN gender = 'M' THEN 1 END) as total_males,
        COUNT(CASE WHEN gender = 'F' THEN 1 END) as total_females,
        COUNT(CASE WHEN relation = 'child' THEN 1 END) as total_children
      FROM samples
    `).get();
    
    console.log('👥 Overall Statistics:');
    console.log(`   📊 Total Samples: ${totalStats.total_samples}`);
    console.log(`   👨 Total Males: ${totalStats.total_males}`);
    console.log(`   👩 Total Females: ${totalStats.total_females}`);
    console.log(`   👶 Total Children: ${totalStats.total_children}`);
    
    console.log('\\n🏷️  Gender by Relation:');
    const relationGroups = {};
    for (const stat of genderStats) {
      if (!relationGroups[stat.relation]) {
        relationGroups[stat.relation] = {};
      }
      relationGroups[stat.relation][stat.gender] = stat.count;
    }
    
    for (const [relation, genders] of Object.entries(relationGroups)) {
      const maleCount = genders['M'] || 0;
      const femaleCount = genders['F'] || 0;
      console.log(`   ${relation}: 👨 ${maleCount}M, 👩 ${femaleCount}F`);
    }
    
    // Show some examples of updated child lab numbers
    const childExamples = db.prepare(`
      SELECT lab_number, name, surname, gender, case_number
      FROM samples 
      WHERE relation = 'child' AND lab_number LIKE '%(%'
      LIMIT 5
    `).all();
    
    if (childExamples.length > 0) {
      console.log('\\n🧬 Example Child Lab Numbers:');
      for (const child of childExamples) {
        const genderIcon = child.gender === 'F' ? '👧' : '👦';
        console.log(`   ${genderIcon} ${child.lab_number}: ${child.name} ${child.surname} (${child.case_number})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
  }
}

// Main execution
async function main() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test database connection
    const testQuery = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    console.log(`   ✅ Database connected (${testQuery.count} samples found)`);
    
    // Execute steps
    addGenderColumn();
    updateGenderForAllSamples();
    updateChildLabNumbers();
    generateSummaryReport();
    
    console.log('\\n🎉 Gender database update completed successfully!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    db.close();
    console.log('👋 Database connection closed.');
  }
}

// Run the script
main();