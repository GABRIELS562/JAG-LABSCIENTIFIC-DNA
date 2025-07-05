const fs = require('fs');
const path = require('path');

class IdentifilerPlusFSAGenerator {
  constructor() {
    // Identifiler Plus loci (15 STR loci + Amelogenin)
    this.loci = {
      'D8S1179': { channel: 'FAM', range: [8, 19] },
      'D21S11': { channel: 'FAM', range: [24, 38] },
      'D7S820': { channel: 'FAM', range: [6, 15] },
      'CSF1PO': { channel: 'FAM', range: [6, 15] },
      'D3S1358': { channel: 'VIC', range: [12, 19] },
      'TH01': { channel: 'VIC', range: [4, 13] },
      'D13S317': { channel: 'VIC', range: [7, 15] },
      'D16S539': { channel: 'VIC', range: [5, 15] },
      'D2S1338': { channel: 'NED', range: [15, 28] },
      'D19S433': { channel: 'NED', range: [9, 17] },
      'vWA': { channel: 'NED', range: [11, 21] },
      'TPOX': { channel: 'NED', range: [6, 13] },
      'D18S51': { channel: 'PET', range: [7, 27] },
      'D5S818': { channel: 'PET', range: [7, 16] },
      'FGA': { channel: 'PET', range: [17, 30] },
      'Amelogenin': { channel: 'PET', range: ['X', 'Y'] }
    };

    // GeneScan LIZ 500 ladder peaks (for 3130 analyzer)
    this.ladderPeaks = [
      { size: 35, rfu: 800 },
      { size: 50, rfu: 1200 },
      { size: 75, rfu: 1500 },
      { size: 100, rfu: 1800 },
      { size: 139, rfu: 2000 },
      { size: 150, rfu: 2200 },
      { size: 160, rfu: 2400 },
      { size: 200, rfu: 2600 },
      { size: 250, rfu: 2800 },
      { size: 300, rfu: 3000 },
      { size: 340, rfu: 3200 },
      { size: 350, rfu: 3400 },
      { size: 400, rfu: 3600 },
      { size: 450, rfu: 3800 },
      { size: 490, rfu: 4000 },
      { size: 500, rfu: 4200 }
    ];

    // Base pair to allele mapping for Identifiler Plus
    this.alleleMapping = {
      'D8S1179': { 8: 119, 9: 123, 10: 127, 11: 131, 12: 135, 13: 139, 14: 143, 15: 147, 16: 151, 17: 155, 18: 159, 19: 163 },
      'D21S11': { 24: 189, 25: 193, 26: 197, 27: 201, 28: 205, 29: 209, 30: 213, 31: 217, 32: 221, 33: 225, 34: 229, 35: 233, 36: 237, 37: 241, 38: 245 },
      'D7S820': { 6: 258, 7: 262, 8: 266, 9: 270, 10: 274, 11: 278, 12: 282, 13: 286, 14: 290, 15: 294 },
      'CSF1PO': { 6: 305, 7: 309, 8: 313, 9: 317, 10: 321, 11: 325, 12: 329, 13: 333, 14: 337, 15: 341 },
      'D3S1358': { 12: 112, 13: 116, 14: 120, 15: 124, 16: 128, 17: 132, 18: 136, 19: 140 },
      'TH01': { 4: 163, 5: 167, 6: 171, 7: 175, 8: 179, 9: 183, '9.3': 186, 10: 187, 11: 191, 12: 195, 13: 199 },
      'D13S317': { 7: 214, 8: 218, 9: 222, 10: 226, 11: 230, 12: 234, 13: 238, 14: 242, 15: 246 },
      'D16S539': { 5: 250, 8: 262, 9: 266, 10: 270, 11: 274, 12: 278, 13: 282, 14: 286, 15: 290 },
      'D2S1338': { 15: 289, 16: 293, 17: 297, 18: 301, 19: 305, 20: 309, 21: 313, 22: 317, 23: 321, 24: 325, 25: 329, 26: 333, 27: 337, 28: 341 },
      'D19S433': { 9: 103, 10: 107, 11: 111, 12: 115, 13: 119, 14: 123, 15: 127, 16: 131, 17: 135 },
      'vWA': { 11: 157, 12: 161, 13: 165, 14: 169, 15: 173, 16: 177, 17: 181, 18: 185, 19: 189, 20: 193, 21: 197 },
      'TPOX': { 6: 224, 7: 228, 8: 232, 9: 236, 10: 240, 11: 244, 12: 248, 13: 252 },
      'D18S51': { 7: 273, 8: 277, 9: 281, 10: 285, 11: 289, 12: 293, 13: 297, 14: 301, 15: 305, 16: 309, 17: 313, 18: 317, 19: 321, 20: 325, 21: 329, 22: 333, 23: 337, 24: 341, 25: 345, 26: 349, 27: 353 },
      'D5S818': { 7: 135, 8: 139, 9: 143, 10: 147, 11: 151, 12: 155, 13: 159, 14: 163, 15: 167, 16: 171 },
      'FGA': { 17: 215, 18: 219, 19: 223, 20: 227, 21: 231, 22: 235, 23: 239, 24: 243, 25: 247, 26: 251, 27: 255, 28: 259, 29: 263, 30: 267 },
      'Amelogenin': { 'X': 106, 'Y': 112 }
    };
  }

  generateProfile(profileType, sampleId) {
    const profile = {};
    
    // Generate realistic STR profile based on type
    if (profileType === 'child') {
      profile.D8S1179 = [12, 14];
      profile.D21S11 = [28, 30];
      profile.D7S820 = [8, 11];
      profile.CSF1PO = [10, 12];
      profile.D3S1358 = [15, 17];
      profile.TH01 = [6, 9.3];
      profile.D13S317 = [11, 12];
      profile.D16S539 = [9, 12];
      profile.D2S1338 = [17, 23];
      profile.D19S433 = [13, 14];
      profile.vWA = [16, 18];
      profile.TPOX = [8, 11];
      profile.D18S51 = [14, 16];
      profile.D5S818 = [11, 12];
      profile.FGA = [22, 24];
      profile.Amelogenin = ['X', 'Y']; // Male child
    } else if (profileType === 'father') {
      profile.D8S1179 = [12, 15];
      profile.D21S11 = [30, 32];
      profile.D7S820 = [10, 11];
      profile.CSF1PO = [12, 13];
      profile.D3S1358 = [15, 16];
      profile.TH01 = [7, 9.3];
      profile.D13S317 = [11, 13];
      profile.D16S539 = [11, 12];
      profile.D2S1338 = [19, 23];
      profile.D19S433 = [13, 15];
      profile.vWA = [17, 18];
      profile.TPOX = [8, 10];
      profile.D18S51 = [14, 18];
      profile.D5S818 = [11, 13];
      profile.FGA = [22, 25];
      profile.Amelogenin = ['X', 'Y']; // Male father
    } else if (profileType === 'mother') {
      profile.D8S1179 = [13, 14];
      profile.D21S11 = [28, 29];
      profile.D7S820 = [8, 9];
      profile.CSF1PO = [10, 11];
      profile.D3S1358 = [16, 17];
      profile.TH01 = [6, 8];
      profile.D13S317 = [12, 14];
      profile.D16S539 = [9, 10];
      profile.D2S1338 = [17, 20];
      profile.D19S433 = [14, 16];
      profile.vWA = [16, 19];
      profile.TPOX = [9, 11];
      profile.D18S51 = [15, 16];
      profile.D5S818 = [12, 13];
      profile.FGA = [21, 24];
      profile.Amelogenin = ['X', 'X']; // Female mother
    }

    return profile;
  }

  generateFSAFile(profile, sampleId, outputPath) {
    // Create ABIF-like structure for FSA file
    const fsaData = {
      header: {
        signature: 'ABIF',
        version: 101,
        dirLocation: 0,
        numElements: 0,
        dataOffset: 0,
        dataHandle: 0
      },
      directory: [],
      data: {}
    };

    // Add sample information
    fsaData.data.SMPL = {
      name: sampleId,
      type: 'Sample',
      elementType: 'pString',
      size: sampleId.length,
      data: sampleId
    };

    // Add run information
    fsaData.data.RUND = {
      name: 'Run Start Date',
      type: 'Date',
      elementType: 'date',
      size: 4,
      data: new Date()
    };

    fsaData.data.RUNT = {
      name: 'Run Start Time',
      type: 'Time',
      elementType: 'time',
      size: 4,
      data: new Date()
    };

    // Add instrument information
    fsaData.data.MCHN = {
      name: 'Machine Name',
      type: 'Machine',
      elementType: 'pString',
      size: 9,
      data: 'ABI_3130'
    };

    fsaData.data.MODL = {
      name: 'Model',
      type: 'Model',
      elementType: 'pString',
      size: 4,
      data: '3130'
    };

    // Add dye information
    fsaData.data.DyeN = {
      name: 'Dye Names',
      type: 'Dye',
      elementType: 'pString',
      size: 4,
      data: ['FAM', 'VIC', 'NED', 'PET', 'LIZ']
    };

    // Generate electropherogram data for each channel
    const channels = ['FAM', 'VIC', 'NED', 'PET', 'LIZ'];
    channels.forEach((channel, index) => {
      const channelData = this.generateChannelData(profile, channel, index + 1);
      fsaData.data[`DATA${index + 1}`] = {
        name: `Channel ${index + 1} Data`,
        type: 'Data',
        elementType: 'short',
        size: channelData.length * 2,
        data: channelData
      };
    });

    // Add GeneScan LIZ 500 ladder data to channel 5
    const ladderData = this.generateLadderData();
    fsaData.data.DATA5 = {
      name: 'Channel 5 Data (LIZ ladder)',
      type: 'Data',
      elementType: 'short',
      size: ladderData.length * 2,
      data: ladderData
    };

    // Create simplified FSA file content
    const fsaContent = this.createFSAContent(fsaData);
    
    // Write to file
    fs.writeFileSync(outputPath, fsaContent);
    console.log(`Generated Identifiler Plus FSA file: ${outputPath}`);
    
    return {
      success: true,
      filePath: outputPath,
      profile: profile,
      sampleId: sampleId
    };
  }

  generateChannelData(profile, channel, channelNumber) {
    const dataPoints = 8000; // Typical number of data points for 3130
    const data = new Array(dataPoints).fill(50); // Baseline around 50 RFU
    
    // Add noise
    for (let i = 0; i < dataPoints; i++) {
      data[i] += Math.random() * 20 - 10; // Random noise ±10 RFU
    }

    // Add allele peaks for this channel
    Object.entries(profile).forEach(([locus, alleles]) => {
      if (this.loci[locus] && this.loci[locus].channel === channel) {
        alleles.forEach(allele => {
          if (this.alleleMapping[locus] && this.alleleMapping[locus][allele]) {
            const basePair = this.alleleMapping[locus][allele];
            const position = Math.floor((basePair / 500) * dataPoints);
            const peakHeight = 200 + Math.random() * 300; // Peak height 200-500 RFU
            
            // Add Gaussian peak
            for (let j = -15; j <= 15; j++) {
              const pos = position + j;
              if (pos >= 0 && pos < dataPoints) {
                const intensity = peakHeight * Math.exp(-(j * j) / 50);
                data[pos] = Math.max(data[pos], intensity);
              }
            }
          }
        });
      }
    });

    return data.map(val => Math.round(Math.max(0, val)));
  }

  generateLadderData() {
    const dataPoints = 8000;
    const data = new Array(dataPoints).fill(50); // Baseline

    // Add noise
    for (let i = 0; i < dataPoints; i++) {
      data[i] += Math.random() * 20 - 10;
    }

    // Add ladder peaks
    this.ladderPeaks.forEach(peak => {
      const position = Math.floor((peak.size / 500) * dataPoints);
      const peakHeight = peak.rfu;
      
      // Add Gaussian peak
      for (let j = -10; j <= 10; j++) {
        const pos = position + j;
        if (pos >= 0 && pos < dataPoints) {
          const intensity = peakHeight * Math.exp(-(j * j) / 25);
          data[pos] = Math.max(data[pos], intensity);
        }
      }
    });

    return data.map(val => Math.round(Math.max(0, val)));
  }

  createFSAContent(fsaData) {
    // Create a simplified FSA file structure
    // This is a mock implementation - real FSA files are complex binary format
    const content = {
      header: 'ABIF',
      version: '1.01',
      instrument: 'ABI_3130',
      chemistry: 'Identifiler_Plus',
      sample: fsaData.data.SMPL.data,
      runDate: new Date().toISOString(),
      channels: {
        FAM: fsaData.data.DATA1 ? fsaData.data.DATA1.data : [],
        VIC: fsaData.data.DATA2 ? fsaData.data.DATA2.data : [],
        NED: fsaData.data.DATA3 ? fsaData.data.DATA3.data : [],
        PET: fsaData.data.DATA4 ? fsaData.data.DATA4.data : [],
        LIZ: fsaData.data.DATA5 ? fsaData.data.DATA5.data : []
      },
      metadata: {
        kit: 'Identifiler_Plus',
        ladderType: 'GeneScan_LIZ_500',
        platform: 'ABI_3130',
        injectionTime: 5,
        injectionVoltage: 1.2,
        runVoltage: 15000,
        runTemperature: 60,
        polymer: 'POP4'
      }
    };

    // Convert to JSON string (simplified format)
    return JSON.stringify(content, null, 2);
  }

  generateDemoSet() {
    const outputDir = '/Users/user/LABSCIENTIFIC-LIMS/identifiler_plus_samples';
    const results = [];

    // Generate child sample
    const childProfile = this.generateProfile('child', 'CHILD_001');
    const childFile = path.join(outputDir, 'IDENTIFILER_CHILD_001.fsa');
    results.push(this.generateFSAFile(childProfile, 'CHILD_001', childFile));

    // Generate father sample
    const fatherProfile = this.generateProfile('father', 'FATHER_001');
    const fatherFile = path.join(outputDir, 'IDENTIFILER_FATHER_001.fsa');
    results.push(this.generateFSAFile(fatherProfile, 'FATHER_001', fatherFile));

    // Generate mother sample
    const motherProfile = this.generateProfile('mother', 'MOTHER_001');
    const motherFile = path.join(outputDir, 'IDENTIFILER_MOTHER_001.fsa');
    results.push(this.generateFSAFile(motherProfile, 'MOTHER_001', motherFile));

    return results;
  }
}

// Generate demo files
const generator = new IdentifilerPlusFSAGenerator();
const results = generator.generateDemoSet();

console.log('Generated Identifiler Plus demo files:');
results.forEach(result => {
  console.log(`  ${result.filePath}`);
  console.log(`    Sample: ${result.sampleId}`);
  console.log(`    Loci: ${Object.keys(result.profile).length}`);
});

console.log('\nConfiguration:');
console.log('  Kit: Identifiler Plus');
console.log('  Ladder: GeneScan LIZ 500');
console.log('  Platform: ABI 3130');
console.log('  RFU Threshold: 50 (optimized for 3130)');