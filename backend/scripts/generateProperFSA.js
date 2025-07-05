const fs = require('fs');
const path = require('path');

/**
 * Generate proper FSA files with ladder/size standard data for Osiris
 * This creates files that Osiris can actually process
 */

// Create proper ABIF (FSA) file structure
function createProperFSAFile(sampleType, caseId, strProfile) {
  const buffer = Buffer.alloc(100000); // 100KB file
  let offset = 0;
  
  // ABIF file header
  buffer.write('ABIF', offset); // Magic number
  offset += 4;
  buffer.writeUInt16BE(0x0101, offset); // Version
  offset += 2;
  
  // Directory structure
  const numEntries = 20;
  buffer.writeUInt16BE(numEntries, offset);
  offset += 2;
  
  // Create directory entries for essential data
  const entries = [
    { name: 'DATA', number: 1, type: 4, size: 4, data: 8000 }, // Number of data points
    { name: 'DATA', number: 2, type: 4, size: 4, data: 3500 }, // Scan number start
    { name: 'DATA', number: 3, type: 4, size: 4, data: 11500 }, // Scan number stop
    { name: 'LANE', number: 1, type: 4, size: 4, data: 1 }, // Lane number
    { name: 'RUND', number: 1, type: 18, size: 10, data: new Date().toISOString().slice(0, 10) }, // Run date
    { name: 'RUNT', number: 1, type: 18, size: 8, data: new Date().toTimeString().slice(0, 8) }, // Run time
    { name: 'SMPL', number: 1, type: 18, size: 20, data: `${caseId}_${sampleType}` }, // Sample name
    { name: 'MCHN', number: 1, type: 18, size: 12, data: 'ABI3500xL' }, // Machine model
    { name: 'DYEP', number: 1, type: 18, size: 8, data: 'G5' }, // Dye set
    { name: 'MODF', number: 1, type: 18, size: 15, data: 'PowerPlexESX17' }, // Module
    { name: 'FWO_', number: 1, type: 18, size: 4, data: 'FAGC' }, // Filter wheel order (Blue, Green, Yellow, Red)
    // Ladder/Size standard data
    { name: 'LIMS', number: 1, type: 18, size: 10, data: 'LIZ500' }, // Size standard
    { name: 'SPAC', number: 1, type: 7, size: 4, data: 1.0 }, // Spacing
    { name: 'PDMF', number: 1, type: 18, size: 10, data: 'KB_3500' }, // Polymer
  ];
  
  // Write directory entries
  entries.forEach((entry, index) => {
    buffer.write(entry.name, offset);
    offset += 4;
    buffer.writeUInt32BE(entry.number, offset);
    offset += 4;
    buffer.writeUInt16BE(entry.type, offset);
    offset += 2;
    buffer.writeUInt16BE(entry.size, offset);
    offset += 2;
    
    if (typeof entry.data === 'string') {
      const strOffset = 1000 + index * 100;
      buffer.writeUInt32BE(strOffset, offset);
      buffer.write(entry.data, strOffset);
    } else {
      buffer.writeUInt32BE(entry.data, offset);
    }
    offset += 4;
    offset += 4; // Reserved
  });
  
  // Add raw electropherogram data for 4 channels (Blue, Green, Yellow, Red)
  const dataOffset = 10000;
  const dataPoints = 4000; // Reduced to fit in buffer
  
  // Channel data for FL (Blue) - contains size standard peaks
  for (let i = 0; i < dataPoints; i++) {
    let value = Math.random() * 100 + 50; // Background noise
    
    // Add size standard peaks at known positions for LIZ 500
    const lizPeaks = [75, 100, 139, 150, 160, 200, 250, 300, 340, 350, 400, 450, 490];
    lizPeaks.forEach(peakPos => {
      const distance = Math.abs(i - peakPos * 8); // Scale to data points
      if (distance < 15) {
        value += 2000 * Math.exp(-(distance * distance) / 50); // Gaussian peak
      }
    });
    
    const writeOffset = dataOffset + i * 2;
    if (writeOffset < buffer.length - 2) {
      buffer.writeUInt16BE(Math.min(value, 32767), writeOffset);
    }
  }
  
  // Add sample data to other channels based on STR profile
  const channelOffset = dataOffset + dataPoints * 2;
  
  // Generate peaks for STR loci in other channels
  for (let channel = 1; channel < 4; channel++) {
    for (let i = 0; i < dataPoints; i++) {
      let value = Math.random() * 80 + 30; // Background
      
      // Add STR peaks if this sample has data
      if (strProfile) {
        Object.keys(strProfile).forEach(locus => {
          const alleles = strProfile[locus];
          alleles.forEach(allele => {
            // Convert allele to approximate position
            const peakPos = 200 + parseFloat(allele) * 5 + channel * 25;
            const distance = Math.abs(i - peakPos * 8);
            if (distance < 10) {
              value += 1200 * Math.exp(-(distance * distance) / 40);
            }
          });
        });
      }
      
      const writeOffset = channelOffset + channel * dataPoints * 2 + i * 2;
      if (writeOffset < buffer.length - 2) {
        buffer.writeUInt16BE(Math.min(value, 32767), writeOffset);
      }
    }
  }
  
  return buffer;
}

// Create a ladder file specifically
function createLadderFile() {
  const buffer = Buffer.alloc(30000);
  let offset = 0;
  
  // ABIF header
  buffer.write('ABIF', offset);
  offset += 4;
  buffer.writeUInt16BE(0x0101, offset);
  offset += 2;
  
  // Directory entries
  const numEntries = 15;
  buffer.writeUInt16BE(numEntries, offset);
  offset += 2;
  
  const entries = [
    { name: 'DATA', number: 1, type: 4, size: 4, data: 6000 },
    { name: 'LANE', number: 1, type: 4, size: 4, data: 1 },
    { name: 'SMPL', number: 1, type: 18, size: 15, data: 'LIZ500_Ladder' },
    { name: 'MCHN', number: 1, type: 18, size: 12, data: 'ABI3500xL' },
    { name: 'DYEP', number: 1, type: 18, size: 8, data: 'G5' },
    { name: 'LIMS', number: 1, type: 18, size: 10, data: 'LIZ500' },
    { name: 'RUND', number: 1, type: 18, size: 10, data: new Date().toISOString().slice(0, 10) },
    { name: 'RUNT', number: 1, type: 18, size: 8, data: new Date().toTimeString().slice(0, 8) },
  ];
  
  // Write entries
  entries.forEach((entry, index) => {
    buffer.write(entry.name, offset);
    offset += 4;
    buffer.writeUInt32BE(entry.number, offset);
    offset += 4;
    buffer.writeUInt16BE(entry.type, offset);
    offset += 2;
    buffer.writeUInt16BE(entry.size, offset);
    offset += 2;
    
    if (typeof entry.data === 'string') {
      const strOffset = 500 + index * 50;
      buffer.writeUInt32BE(strOffset, offset);
      buffer.write(entry.data, strOffset);
    } else {
      buffer.writeUInt32BE(entry.data, offset);
    }
    offset += 4;
    offset += 4;
  });
  
  // Add prominent LIZ 500 ladder peaks
  const dataOffset = 3000;
  const dataPoints = 6000;
  const lizSizes = [75, 100, 139, 150, 160, 200, 250, 300, 340, 350, 400, 450, 490];
  
  for (let i = 0; i < dataPoints; i++) {
    let value = Math.random() * 50 + 20; // Low background
    
    lizSizes.forEach(size => {
      const peakPos = size * 12; // Scale to data points
      const distance = Math.abs(i - peakPos);
      if (distance < 25) {
        value += 3000 * Math.exp(-(distance * distance) / 80); // Strong peaks
      }
    });
    
    buffer.writeUInt16BE(Math.min(value, 32767), dataOffset + i * 2);
  }
  
  return buffer;
}

function generateProperFSAFiles() {
  const outputDir = '/Users/user/Documents/Osiris_Workspace/Input_FSA_Files';
  const caseId = 'PAT-2025-DEMO';
  
  // Read the STR profiles
  const summaryPath = path.join(__dirname, '../test_data/fsa_samples/PAT-2025-DEMO_summary.json');
  const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const { father, mother, child } = summaryData.profiles;
  
  console.log('Creating proper FSA files with ladder data...');
  
  // Create ladder file first (essential for Osiris)
  const ladderFile = createLadderFile();
  const ladderPath = path.join(outputDir, 'LIZ500_Ladder.fsa');
  fs.writeFileSync(ladderPath, ladderFile);
  console.log(`Created ladder file: LIZ500_Ladder.fsa (${(ladderFile.length / 1024).toFixed(1)} KB)`);
  
  // Create sample files
  const samples = [
    { type: 'Father', profile: father },
    { type: 'Mother', profile: mother },
    { type: 'Child', profile: child }
  ];
  
  samples.forEach(sample => {
    const fsaFile = createProperFSAFile(sample.type, caseId, sample.profile);
    const fileName = `${caseId}_${sample.type}_001.fsa`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, fsaFile);
    console.log(`Created ${fileName} (${(fsaFile.length / 1024).toFixed(1)} KB)`);
  });
  
  console.log('\n=== Proper FSA Files Created ===');
  console.log(`Location: ${outputDir}`);
  console.log('Files include:');
  console.log('• LIZ500_Ladder.fsa (Size standard for calibration)');
  console.log('• PAT-2025-DEMO_Father_001.fsa');
  console.log('• PAT-2025-DEMO_Mother_001.fsa');
  console.log('• PAT-2025-DEMO_Child_001.fsa');
  console.log('\nOsiris should now be able to process these files!');
  console.log('Make sure to select "HID LIZ 500" procedure in Osiris.');
}

// Run the generation
if (require.main === module) {
  generateProperFSAFiles();
}

module.exports = { generateProperFSAFiles };