#!/usr/bin/env node

// Script to properly randomize gender for ALL children and update their lab numbers
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

);

function randomizeAllChildrenGenders() {
  try {
    // Get all child samples (various relation formats)
    const childSamples = db.prepare(`
      SELECT id, lab_number, name, surname, relation, gender 
      FROM samples 
      WHERE relation LIKE '%child%' OR relation = 'Child'
    `).all();
    
    const updateGenderStmt = db.prepare('UPDATE samples SET gender = ? WHERE id = ?');
    
    let maleChildren = 0;
    let femaleChildren = 0;
    
    const genderTransaction = db.transaction(() => {
      for (const child of childSamples) {
        // Randomize gender (50/50 chance)
        const newGender = Math.random() < 0.5 ? 'M' : 'F';
        updateGenderStmt.run(newGender, child.id);
        
        if (newGender === 'M') {
          maleChildren++;
        } else {
          femaleChildren++;
        }
        
        const genderIcon = newGender === 'M' ? '👦' : '👧';
        }
    });
    
    genderTransaction();
    
    return childSamples.length;
    
  } catch (error) {
    console.error('❌ Error randomizing child genders:', error.message);
    throw error;
  }
}

function updateAllChildLabNumbers() {
  try {
    // Get all child samples with their updated genders
    const childSamples = db.prepare(`
      SELECT id, lab_number, name, surname, gender, case_number, case_id
      FROM samples 
      WHERE relation LIKE '%child%' OR relation = 'Child'
      ORDER BY case_number, lab_number
    `).all();
    
    const updateLabNumberStmt = db.prepare('UPDATE samples SET lab_number = ? WHERE id = ?');
    let updatedCount = 0;
    let skippedCount = 0;
    
    const labUpdateTransaction = db.transaction(() => {
      for (const child of childSamples) {
        try {
          // Skip if already has proper format (contains parentheses and gender)
          if (child.lab_number.includes('(') && (child.lab_number.includes('M') || child.lab_number.includes('F'))) {
            // Just update the gender indicator if it's wrong
            const currentGenderInLab = child.lab_number.slice(-1);
            if (currentGenderInLab !== child.gender) {
              const newLabNumber = child.lab_number.slice(0, -1) + child.gender;
              updateLabNumberStmt.run(newLabNumber, child.id);
              updatedCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
          
          // Find father in same case
          let father = null;
          if (child.case_number) {
            father = db.prepare(`
              SELECT lab_number 
              FROM samples 
              WHERE case_number = ? 
              AND (relation = 'alleged_father' OR relation = 'Father' OR relation LIKE '%father%')
              AND relation NOT LIKE '%child%'
              LIMIT 1
            `).get(child.case_number);
          }
          
          // If no father found by case_number, try case_id
          if (!father && child.case_id) {
            father = db.prepare(`
              SELECT lab_number 
              FROM samples 
              WHERE case_id = ? 
              AND (relation = 'alleged_father' OR relation = 'Father' OR relation LIKE '%father%')
              AND relation NOT LIKE '%child%'
              LIMIT 1
            `).get(child.case_id);
          }
          
          if (father && father.lab_number) {
            // Extract base number from child lab number
            const labMatch = child.lab_number.match(/25_(\d+)/);
            if (labMatch) {
              const childBaseNumber = labMatch[1];
              const genderIndicator = child.gender;
              
              // Create new lab number format: child(father)Gender
              const newLabNumber = `25_${childBaseNumber}(${father.lab_number})${genderIndicator}`;
              
              updateLabNumberStmt.run(newLabNumber, child.id);
              updatedCount++;
              
              const genderIcon = child.gender === 'M' ? '👦' : '👧';
              } else {
              skippedCount++;
            }
          } else {
            `);
            skippedCount++;
          }
        } catch (childError) {
          skippedCount++;
        }
      }
    });
    
    labUpdateTransaction();
    
    } catch (error) {
    console.error('❌ Error updating child lab numbers:', error.message);
    throw error;
  }
}

function generateFinalReport() {
  );
  
  try {
    // Get all children with their final details
    const allChildren = db.prepare(`
      SELECT lab_number, name, surname, gender, case_number, relation
      FROM samples 
      WHERE relation LIKE '%child%' OR relation = 'Child'
      ORDER BY case_number, lab_number
    `).all();
    
    // Count by gender
    const maleCount = allChildren.filter(c => c.gender === 'M').length;
    const femaleCount = allChildren.filter(c => c.gender === 'F').length;
    
    // Show examples by case
    const childrenByCase = {};
    for (const child of allChildren) {
      const caseKey = child.case_number || 'No Case';
      if (!childrenByCase[caseKey]) {
        childrenByCase[caseKey] = [];
      }
      childrenByCase[caseKey].push(child);
    }
    
    :');
    let caseCount = 0;
    for (const [caseNumber, children] of Object.entries(childrenByCase)) {
      if (caseCount >= 10) break;
      
      for (const child of children) {
        const genderIcon = child.gender === 'M' ? '👦' : '👧';
        }
      caseCount++;
    }
    
    // Show lab number format statistics
    const withParentheses = allChildren.filter(c => c.lab_number.includes('(')).length;
    const withGenderIndicator = allChildren.filter(c => c.lab_number.match(/[MF]$/)).length;
    
    } catch (error) {
    console.error('❌ Error generating report:', error.message);
  }
}

// Main execution
async function main() {
  try {
    // Test database connection
    const testQuery = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    `);
    
    // Execute steps
    const childrenCount = randomizeAllChildrenGenders();
    if (childrenCount > 0) {
      updateAllChildLabNumbers();
    }
    generateFinalReport();
    
    } catch (error) {
    console.error('💥 Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
    }
}

// Run the script
main();