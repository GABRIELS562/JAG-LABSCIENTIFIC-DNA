const db = require('../services/database');

// Script to fix lab number ordering for existing records
// Should be: Child (lowest number), Father (middle), Mother (highest)

async function fixLabNumberOrdering() {
  console.log('Starting lab number ordering fix...');
  
  try {
    // Get all samples grouped by case
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
    
    console.log(`Found ${Object.keys(caseGroups).length} cases to process`);
    
    let fixedCases = 0;
    let totalSamplesUpdated = 0;
    
    // Process each case
    for (const [caseNumber, samples] of Object.entries(caseGroups)) {
      if (samples.length < 2) continue; // Skip single samples
      
      // Sort samples by current lab number to find the sequence
      const sortedSamples = samples.sort((a, b) => {
        const numA = parseInt(a.lab_number.split('_')[1]) || 0;
        const numB = parseInt(b.lab_number.split('_')[1]) || 0;
        return numA - numB;
      });
      
      // Find child, father, mother
      const child = samples.find(s => s.relation === 'Child');
      const father = samples.find(s => s.relation === 'Alleged Father');
      const mother = samples.find(s => s.relation === 'Mother');
      
      if (!child || !father) {
        console.log(`⚠️  Skipping ${caseNumber}: Missing child or father`);
        continue;
      }
      
      // Get the lowest lab number in the group
      const lowestLabNumber = sortedSamples[0].lab_number;
      const prefix = lowestLabNumber.includes('LT') ? 'LT' : '';
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
        console.log(`✅ ${caseNumber}: Already in correct order`);
        continue;
      }
      
      console.log(`🔄 Fixing ${caseNumber}:`);
      console.log(`   Child: ${child.lab_number} → ${newLabNumbers.child}`);
      console.log(`   Father: ${father.lab_number} → ${newLabNumbers.father}`);
      if (mother) {
        console.log(`   Mother: ${mother.lab_number} → ${newLabNumbers.mother}`);
      }
      
      // Update lab numbers in database
      const updateStmt = db.db.prepare('UPDATE samples SET lab_number = ? WHERE id = ?');
      
      try {
        updateStmt.run(newLabNumbers.child, child.id);
        updateStmt.run(newLabNumbers.father, father.id);
        if (mother && newLabNumbers.mother) {
          updateStmt.run(newLabNumbers.mother, mother.id);
        }
        
        fixedCases++;
        totalSamplesUpdated += mother ? 3 : 2;
        console.log(`✅ Updated ${caseNumber}`);
        
      } catch (error) {
        console.error(`❌ Error updating ${caseNumber}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fix complete!`);
    console.log(`📊 Fixed ${fixedCases} cases`);
    console.log(`🔢 Updated ${totalSamplesUpdated} sample lab numbers`);
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

// Run the fix
if (require.main === module) {
  fixLabNumberOrdering().then(() => {
    console.log('Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { fixLabNumberOrdering };