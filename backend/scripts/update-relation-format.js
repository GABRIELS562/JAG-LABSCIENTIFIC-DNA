const db = require('../services/database');

// Script to update relation format for existing records
// Child relation should reference the father's lab number

async function updateRelationFormat() {
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
    
    .length} cases to process`);
    
    let updatedCases = 0;
    let totalSamplesUpdated = 0;
    
    // Process each case
    for (const [caseNumber, samples] of Object.entries(caseGroups)) {
      if (samples.length < 2) continue; // Skip single samples
      
      // Find child and father
      const child = samples.find(s => s.relation && s.relation.includes('Child'));
      const father = samples.find(s => s.relation && s.relation.includes('Father'));
      
      if (!child || !father) {
        continue;
      }
      
      // Check if child relation needs updating
      const expectedChildRelation = `Child(${father.lab_number})`;
      if (child.relation !== expectedChildRelation) {
        try {
          const updateStmt = db.db.prepare('UPDATE samples SET relation = ? WHERE id = ?');
          updateStmt.run(expectedChildRelation, child.id);
          
          updatedCases++;
          totalSamplesUpdated++;
          } catch (error) {
          console.error(`❌ Error updating ${caseNumber}:`, error.message);
        }
      } else {
        }
    }
    
    } catch (error) {
    console.error('❌ Error during update:', error);
  }
}

// Run the update
if (require.main === module) {
  updateRelationFormat().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { updateRelationFormat };