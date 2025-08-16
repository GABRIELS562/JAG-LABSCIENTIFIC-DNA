const db = require('../services/database');

// Script to fix lab number ordering for existing records
// Uses temporary numbers to avoid UNIQUE constraint conflicts

async function fixLabNumberOrderingV2() {
  try {
    // Get all samples that need fixing
    const allSamples = db.getAllSamples();
    const caseGroups = {};
    
    // Group samples by case
    allSamples.forEach(sample => {
      if (sample.case_number) {
        if (!caseGroups[sample.case_number]) {
          caseGroups[sample.case_number] = [];
        }
        caseGroups[sample.case_number].push(sample);
      }
    });
    
    .length} cases to process`);
    
    let fixedCases = 0;
    let totalSamplesUpdated = 0;
    
    // Process each case
    for (const [caseNumber, samples] of Object.entries(caseGroups)) {
      if (samples.length < 2) continue; // Skip single samples
      
      // Find child, father, mother
      const child = samples.find(s => s.relation === 'Child');
      const father = samples.find(s => s.relation === 'Alleged Father');
      const mother = samples.find(s => s.relation === 'Mother');
      
      if (!child || !father) {
        continue;
      }
      
      // Sort samples by current lab number to find the sequence
      const sortedSamples = samples.sort((a, b) => {
        const numA = parseInt(a.lab_number.split('_')[1]) || 0;
        const numB = parseInt(b.lab_number.split('_')[1]) || 0;
        return numA - numB;
      });
      
      // Get the lowest lab number in the group
      const lowestLabNumber = sortedSamples[0].lab_number;
      const yearPrefix = lowestLabNumber.split('_')[0];
      const baseNumber = parseInt(lowestLabNumber.split('_')[1]);
      
      // Assign new lab numbers in correct order: Child, Father, Mother
      const newLabNumbers = {
        child: `${yearPrefix}_${baseNumber}`,
        father: `${yearPrefix}_${baseNumber + 1}`,
        mother: mother ? `${yearPrefix}_${baseNumber + 2}` : null
      };
      
      // Check if changes are needed
      const needsUpdate = (
        child.lab_number !== newLabNumbers.child ||
        father.lab_number !== newLabNumbers.father ||
        (mother && mother.lab_number !== newLabNumbers.mother)
      );
      
      if (!needsUpdate) {
        continue;
      }
      
      if (mother) {
        }
      
      // Use transaction to avoid conflicts
      const transaction = db.db.transaction(() => {
        // Step 1: Assign temporary numbers to avoid conflicts
        const tempPrefix = 'TEMP_' + Date.now();
        const updateTempStmt = db.db.prepare('UPDATE samples SET lab_number = ? WHERE id = ?');
        
        updateTempStmt.run(`${tempPrefix}_child`, child.id);
        updateTempStmt.run(`${tempPrefix}_father`, father.id);
        if (mother) {
          updateTempStmt.run(`${tempPrefix}_mother`, mother.id);
        }
        
        // Step 2: Assign final numbers
        const updateFinalStmt = db.db.prepare('UPDATE samples SET lab_number = ? WHERE id = ?');
        
        updateFinalStmt.run(newLabNumbers.child, child.id);
        updateFinalStmt.run(newLabNumbers.father, father.id);
        if (mother && newLabNumbers.mother) {
          updateFinalStmt.run(newLabNumbers.mother, mother.id);
        }
      });
      
      try {
        transaction();
        fixedCases++;
        totalSamplesUpdated += mother ? 3 : 2;
        } catch (error) {
        console.error(`❌ Error updating ${caseNumber}:`, error.message);
      }
    }
    
    } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

// Run the fix
if (require.main === module) {
  fixLabNumberOrderingV2().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { fixLabNumberOrderingV2 };