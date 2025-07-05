const db = require('../services/database');
const fs = require('fs');
const path = require('path');

/**
 * Create demo case with real FSA data for testing
 */

function createDemoCase() {
  try {
    // Read the generated FSA summary data
    const summaryPath = path.join(__dirname, '../test_data/fsa_samples/PAT-2025-DEMO_summary.json');
    
    if (!fs.existsSync(summaryPath)) {
      console.error('FSA summary file not found. Please run generateDummyFSA.js first.');
      return;
    }
    
    const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const { father, mother, child } = summaryData.profiles;
    
    // Create the case
    const caseId = 'PAT-2025-DEMO';
    
    try {
      // Check if case already exists
      const existingCase = db.getGeneticCase(caseId);
      if (existingCase) {
        console.log(`Case ${caseId} already exists. Updating with new data...`);
      } else {
        console.log(`Creating new case: ${caseId}`);
        db.createGeneticCase({
          caseId: caseId,
          caseType: 'paternity',
          priority: 'normal',
          notes: 'Demo case with realistic PowerPlex ESX 17 STR data generated for testing'
        });
      }
      
      // Update case status
      db.db.prepare(`
        UPDATE genetic_cases 
        SET status = 'analysis_complete',
            updated_date = datetime('now')
        WHERE case_id = ?
      `).run(caseId);
      
      // Create analysis results
      let resultId;
      try {
        const result = db.db.prepare(`
          INSERT OR REPLACE INTO genetic_analysis_results 
          (case_id, paternity_probability, exclusion_probability, matching_loci, 
           total_loci, conclusion, quality_score)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          caseId,
          99.97,
          0.03,
          17, // All 17 STR loci match
          17,
          'inclusion',
          87.5
        );
        resultId = result.lastInsertRowid;
      } catch (insertError) {
        console.log('Analysis results already exist, getting existing result ID...');
        const existing = db.db.prepare('SELECT id FROM genetic_analysis_results WHERE case_id = ?').get(caseId);
        resultId = existing ? existing.id : 1;
      }
      
      // Create sample records
      const samples = [
        { id: `PAT-2025-DEMO_father_001`, type: 'alleged_father', profile: father },
        { id: `PAT-2025-DEMO_mother_001`, type: 'mother', profile: mother },
        { id: `PAT-2025-DEMO_child_001`, type: 'child', profile: child }
      ];
      
      samples.forEach(sample => {
        try {
          db.db.prepare(`
            INSERT OR REPLACE INTO genetic_samples 
            (sample_id, case_id, sample_type, original_filename, quality_score, 
             received_date, kit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            sample.id,
            caseId,
            sample.type,
            `${sample.id}.fsa`,
            85.0 + Math.random() * 10, // Quality score 85-95
            new Date().toISOString(),
            'PowerPlex ESX 17'
          );
        } catch (sampleError) {
          console.log(`Sample ${sample.id} already exists`);
        }
        
        // Add STR profile data
        Object.keys(sample.profile).forEach(locus => {
          const alleles = sample.profile[locus];
          try {
            db.db.prepare(`
              INSERT OR REPLACE INTO str_profiles
              (sample_id, locus, allele_1, allele_2, peak_height_1, peak_height_2)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              sample.id,
              locus,
              alleles[0] || null,
              alleles[1] || null,
              800 + Math.random() * 600, // Random peak height 800-1400
              800 + Math.random() * 600
            );
          } catch (profileError) {
            // Ignore if already exists
          }
        });
      });
      
      // Create loci comparisons showing inheritance patterns
      const loci = Object.keys(father);
      loci.forEach(locus => {
        const fatherAlleles = father[locus];
        const motherAlleles = mother[locus];
        const childAlleles = child[locus];
        
        // Determine if child inherited from father (for paternity analysis)
        const inheritedFromFather = childAlleles.some(allele => fatherAlleles.includes(allele));
        const matchStatus = inheritedFromFather ? 1 : 0;
        
        try {
          db.db.prepare(`
            INSERT OR REPLACE INTO loci_comparisons
            (result_id, locus, child_allele_1, child_allele_2, 
             father_allele_1, father_allele_2, mother_allele_1, mother_allele_2, match_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            resultId,
            locus,
            childAlleles[0] || null,
            childAlleles[1] || null,
            fatherAlleles[0] || null,
            fatherAlleles[1] || null,
            motherAlleles[0] || null,
            motherAlleles[1] || null,
            matchStatus
          );
        } catch (lociError) {
          console.log(`Loci comparison for ${locus} already exists`);
        }
      });
      
      console.log('\n=== Demo Case Created Successfully ===');
      console.log(`Case ID: ${caseId}`);
      console.log(`Status: analysis_complete`);
      console.log(`Paternity Probability: 99.97%`);
      console.log(`Conclusion: inclusion`);
      console.log(`STR Loci: ${loci.length} (${loci.join(', ')})`);
      console.log(`Samples: Father, Mother, Child`);
      console.log(`FSA Files: Available in backend/test_data/fsa_samples/`);
      console.log('\nThis case can now be viewed in the LIMS with real STR data!');
      
      return {
        success: true,
        caseId: caseId,
        profiles: { father, mother, child }
      };
      
    } catch (dbError) {
      console.error('Database error:', dbError.message);
      return { success: false, error: dbError.message };
    }
    
  } catch (error) {
    console.error('Error creating demo case:', error.message);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  createDemoCase();
}

module.exports = { createDemoCase };