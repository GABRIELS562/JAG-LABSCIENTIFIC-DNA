const fs = require('fs');
const path = require('path');

/**
 * Generate realistic dummy FSA files for PowerPlex ESX 17 STR testing
 * These files simulate real Applied Biosystems data format
 */

// PowerPlex ESX 17 Loci Configuration (17 STR loci + Amelogenin)
const PPESX17_LOCI = {
  'AMEL': { dye: 'FL', bp_range: [106, 112] },      // Sex determination
  'D3S1358': { dye: 'FL', bp_range: [112, 140] },
  'TH01': { dye: 'FL', bp_range: [179, 203] },
  'D21S11': { dye: 'JOE', bp_range: [189, 243] },
  'D18S51': { dye: 'JOE', bp_range: [272, 341] },
  'Penta E': { dye: 'JOE', bp_range: [372, 477] },
  'D5S818': { dye: 'TMR', bp_range: [135, 171] },
  'D13S317': { dye: 'TMR', bp_range: [214, 242] },
  'D7S820': { dye: 'TMR', bp_range: [258, 294] },
  'D16S539': { dye: 'TMR', bp_range: [305, 341] },
  'CSF1PO': { dye: 'TMR', bp_range: [347, 375] },
  'Penta D': { dye: 'TMR', bp_range: [380, 445] },
  'vWA': { dye: 'CXR', bp_range: [157, 193] },
  'D8S1179': { dye: 'CXR', bp_range: [222, 266] },
  'TPOX': { dye: 'CXR', bp_range: [108, 144] },
  'FGA': { dye: 'CXR', bp_range: [215, 267] },
  'D2S1338': { dye: 'CXR', bp_range: [311, 355] },
  'D19S433': { dye: 'CXR', bp_range: [365, 421] }
};

// Common STR allele values for each loci
const ALLELE_RANGES = {
  'AMEL': ['X', 'Y'],
  'D3S1358': ['12', '13', '14', '15', '16', '17', '18', '19'],
  'TH01': ['6', '7', '8', '9', '9.3', '10'],
  'D21S11': ['24.2', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
  'D18S51': ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
  'Penta E': ['5', '7', '8', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
  'D5S818': ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
  'D13S317': ['8', '9', '10', '11', '12', '13', '14', '15'],
  'D7S820': ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
  'D16S539': ['5', '8', '9', '10', '11', '12', '13', '14', '15'],
  'CSF1PO': ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
  'Penta D': ['2.2', '5', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
  'vWA': ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
  'D8S1179': ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
  'TPOX': ['6', '7', '8', '9', '10', '11', '12', '13'],
  'FGA': ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28'],
  'D2S1338': ['15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27'],
  'D19S433': ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18']
};

// Generate genetic profiles for a family trio
function generateFamilyProfiles() {
  const father = {};
  const mother = {};
  const child = {};

  // Generate father and mother profiles
  Object.keys(ALLELE_RANGES).forEach(locus => {
    if (locus === 'AMEL') {
      father[locus] = ['X', 'Y']; // Male
      mother[locus] = ['X', 'X']; // Female
    } else {
      const alleles = ALLELE_RANGES[locus];
      
      // Father alleles
      const f1 = alleles[Math.floor(Math.random() * alleles.length)];
      const f2 = alleles[Math.floor(Math.random() * alleles.length)];
      father[locus] = [f1, f2].sort();
      
      // Mother alleles
      const m1 = alleles[Math.floor(Math.random() * alleles.length)];
      const m2 = alleles[Math.floor(Math.random() * alleles.length)];
      mother[locus] = [m1, m2].sort();
    }
  });

  // Generate child profile (inherits one allele from each parent)
  Object.keys(ALLELE_RANGES).forEach(locus => {
    if (locus === 'AMEL') {
      // Child sex determination (50% chance of X or Y from father)
      const fromFather = Math.random() > 0.5 ? 'X' : 'Y';
      child[locus] = ['X', fromFather].sort();
    } else {
      const fromFather = father[locus][Math.floor(Math.random() * father[locus].length)];
      const fromMother = mother[locus][Math.floor(Math.random() * mother[locus].length)];
      child[locus] = [fromFather, fromMother].sort();
    }
  });

  return { father, mother, child };
}

// Create FSA file header (ABIF format simulation)
function createFSAHeader() {
  const header = Buffer.alloc(128);
  header.write('ABIF', 0); // Magic number
  header.writeUInt16BE(0x0101, 4); // Version
  return header;
}

// Generate electropherogram data points for a locus
function generateElectrophData(locus, alleles, dye) {
  const config = PPESX17_LOCI[locus];
  const data = [];
  
  // Generate background noise
  for (let i = 0; i < 8000; i++) {
    data.push(Math.random() * 50 + 20); // Background RFU 20-70
  }
  
  // Add peaks for each allele
  alleles.forEach((allele, index) => {
    if (allele === 'X' || allele === 'Y') {
      // Amelogenin peaks
      const peakPos = allele === 'X' ? 106 : 112;
      const startPos = Math.floor((peakPos - 50) * 40); // Convert bp to data points
      const peakHeight = 800 + Math.random() * 600; // RFU 800-1400
      
      // Create Gaussian peak
      for (let i = -20; i <= 20; i++) {
        const pos = startPos + i;
        if (pos >= 0 && pos < data.length) {
          const intensity = peakHeight * Math.exp(-(i * i) / 50);
          data[pos] = Math.max(data[pos], intensity);
        }
      }
    } else {
      // Regular STR allele peaks
      const bp = config.bp_range[0] + (parseFloat(allele) - 6) * 4; // Approximate bp position
      const startPos = Math.floor((bp - 50) * 40);
      const peakHeight = 600 + Math.random() * 800; // RFU 600-1400
      
      // Create Gaussian peak
      for (let i = -15; i <= 15; i++) {
        const pos = startPos + i;
        if (pos >= 0 && pos < data.length) {
          const intensity = peakHeight * Math.exp(-(i * i) / 40);
          data[pos] = Math.max(data[pos], intensity);
        }
      }
    }
  });
  
  return data;
}

// Create FSA file content (simplified ABIF format)
function createFSAFile(profile, sampleType, caseId) {
  const header = createFSAHeader();
  let fileContent = [header];
  
  // Sample information
  const sampleInfo = {
    sampleName: `${caseId}_${sampleType}`,
    instrumentModel: 'ABI 3500xL',
    kit: 'PowerPlex ESX 17',
    operator: 'Lab Technician',
    runDate: new Date().toISOString(),
    dyeSet: 'G5'
  };
  
  // Generate data for each dye channel
  const dyeChannels = ['FL', 'JOE', 'TMR', 'CXR'];
  
  dyeChannels.forEach(dye => {
    const channelData = Buffer.alloc(32000); // 8000 data points * 4 bytes
    let dataOffset = 0;
    
    // Find loci for this dye
    const lociInDye = Object.keys(PPESX17_LOCI).filter(locus => 
      PPESX17_LOCI[locus].dye === dye
    );
    
    // Generate combined electropherogram for all loci in this dye
    const combinedData = new Array(8000).fill(0);
    
    lociInDye.forEach(locus => {
      if (profile[locus]) {
        const locusData = generateElectrophData(locus, profile[locus], dye);
        locusData.forEach((value, index) => {
          combinedData[index] = Math.max(combinedData[index], value);
        });
      }
    });
    
    // Write data to buffer
    combinedData.forEach(value => {
      channelData.writeFloatLE(value, dataOffset);
      dataOffset += 4;
    });
    
    fileContent.push(channelData);
  });
  
  // Add metadata
  const metadata = JSON.stringify({
    ...sampleInfo,
    profile: profile,
    loci: Object.keys(profile).map(locus => ({
      locus,
      alleles: profile[locus],
      dye: PPESX17_LOCI[locus]?.dye || 'Unknown'
    }))
  });
  
  const metadataBuffer = Buffer.from(metadata, 'utf8');
  fileContent.push(metadataBuffer);
  
  return Buffer.concat(fileContent);
}

// Generate the family trio FSA files
function generateFamilyFSAFiles() {
  const { father, mother, child } = generateFamilyProfiles();
  const caseId = 'PAT-2025-DEMO';
  const outputDir = '/Users/user/LABSCIENTIFIC-LIMS/backend/test_data/fsa_samples';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate FSA files
  const files = [
    { profile: father, type: 'father', filename: `${caseId}_Father_001.fsa` },
    { profile: mother, type: 'mother', filename: `${caseId}_Mother_001.fsa` },
    { profile: child, type: 'child', filename: `${caseId}_Child_001.fsa` }
  ];
  
  const results = [];
  
  files.forEach(({ profile, type, filename }) => {
    const fsaContent = createFSAFile(profile, type, caseId);
    const filePath = path.join(outputDir, filename);
    
    fs.writeFileSync(filePath, fsaContent);
    
    results.push({
      filename,
      filePath,
      type,
      profile,
      size: fsaContent.length
    });
    
    console.log(`Generated ${filename} (${(fsaContent.length / 1024).toFixed(1)} KB)`);
  });
  
  // Create a summary file
  const summary = {
    caseId,
    generatedDate: new Date().toISOString(),
    kit: 'PowerPlex ESX 17',
    files: results.map(r => ({
      filename: r.filename,
      type: r.type,
      size: r.size,
      lociCount: Object.keys(r.profile).length
    })),
    profiles: { father, mother, child }
  };
  
  fs.writeFileSync(
    path.join(outputDir, `${caseId}_summary.json`),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n=== Family Trio FSA Files Generated ===');
  console.log(`Case ID: ${caseId}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Files generated: ${results.length}`);
  console.log(`Total size: ${(results.reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(1)} KB`);
  
  return results;
}

// Run the generation
if (require.main === module) {
  generateFamilyFSAFiles();
}

module.exports = { generateFamilyFSAFiles, PPESX17_LOCI, ALLELE_RANGES };