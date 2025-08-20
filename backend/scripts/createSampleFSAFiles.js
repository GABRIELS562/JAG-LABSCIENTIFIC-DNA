#!/usr/bin/env node

/**
 * Sample FSA File Generator for OSIRIS Testing
 * Creates realistic FSA file structures for paternity testing demonstrations
 */

const fs = require('fs').promises;
const path = require('path');

class SampleFSAGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'sample-data', 'fsa-files');
    
    // Standard STR loci for PowerPlex ESX 17
    this.strLoci = [
      'D3S1358', 'vWA', 'D16S539', 'CSF1PO', 'TPOX', 'D8S1179', 'D21S11', 'D18S51',
      'D2S441', 'D19S433', 'TH01', 'FGA', 'D22S1045', 'D5S818', 'D13S317', 'D7S820', 'AMEL'
    ];

    // Common alleles for each locus
    this.alleleRanges = {
      'D3S1358': ['12', '13', '14', '15', '16', '17', '18', '19'],
      'vWA': ['11', '14', '15', '16', '17', '18', '19', '20'],
      'D16S539': ['5', '8', '9', '10', '11', '12', '13', '14', '15'],
      'CSF1PO': ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
      'TPOX': ['6', '7', '8', '9', '10', '11', '12', '13'],
      'D8S1179': ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
      'D21S11': ['24.2', '25', '26', '27', '28', '29', '30', '31', '32', '32.2', '33', '33.2', '34', '35'],
      'D18S51': ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
      'D2S441': ['8', '9', '10', '11', '11.3', '12', '13', '14', '15', '16'],
      'D19S433': ['9', '10', '11', '12', '13', '14', '15', '15.2', '16', '17'],
      'TH01': ['4', '5', '6', '7', '8', '9', '9.3', '10', '11'],
      'FGA': ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28'],
      'D22S1045': ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
      'D5S818': ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
      'D13S317': ['7', '8', '9', '10', '11', '12', '13', '14', '15'],
      'D7S820': ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
      'AMEL': ['X', 'Y']
    };
  }

  /**
   * Generate sample FSA files for a paternity case
   */
  async generatePaternityCase(caseId = 'PT001') {
    await fs.mkdir(this.outputDir, { recursive: true });

    console.log(`🧬 Generating sample FSA files for case: ${caseId}`);

    // Generate STR profiles for family trio
    const profiles = this.generateFamilyProfiles();

    const samples = [
      {
        name: `${caseId}_Child_001`,
        type: 'child',
        profile: profiles.child
      },
      {
        name: `${caseId}_Father_001`,
        type: 'alleged_father',
        profile: profiles.father
      },
      {
        name: `${caseId}_Mother_001`,
        type: 'mother',
        profile: profiles.mother
      },
      {
        name: `${caseId}_PosCtrl_001`,
        type: 'positive_control',
        profile: this.generateControlProfile()
      },
      {
        name: `${caseId}_NegCtrl_001`,
        type: 'negative_control',
        profile: this.generateNegativeControlProfile()
      },
      {
        name: `${caseId}_Ladder_001`,
        type: 'allelic_ladder',
        profile: this.generateLadderProfile()
      }
    ];

    const generatedFiles = [];

    for (const sample of samples) {
      const filePath = path.join(this.outputDir, `${sample.name}.fsa`);
      await this.generateFSAFile(filePath, sample);
      generatedFiles.push({
        name: sample.name,
        type: sample.type,
        path: filePath,
        size: (await fs.stat(filePath)).size
      });
    }

    // Create case metadata
    const metadata = {
      caseId,
      generated: new Date().toISOString(),
      instrument: 'Applied Biosystems 3130xl Genetic Analyzer',
      kit: 'PowerPlex ESX 17 System',
      samples: generatedFiles,
      notes: 'Sample FSA files generated for OSIRIS demonstration purposes'
    };

    await fs.writeFile(
      path.join(this.outputDir, `${caseId}_metadata.json`),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`✅ Generated ${generatedFiles.length} FSA files:`);
    generatedFiles.forEach(file => {
      console.log(`   📄 ${file.name}.fsa (${Math.round(file.size / 1024)}KB) - ${file.type}`);
    });

    return { success: true, files: generatedFiles, metadata };
  }

  /**
   * Generate realistic family STR profiles
   */
  generateFamilyProfiles() {
    // Generate mother's profile first
    const mother = this.generateRandomProfile('mother');
    
    // Generate father's profile
    const father = this.generateRandomProfile('father');
    
    // Generate child's profile inheriting from parents
    const child = this.generateChildProfile(mother, father);

    return { mother, father, child };
  }

  /**
   * Generate child profile inheriting alleles from parents
   */
  generateChildProfile(mother, father) {
    const child = {};

    for (const locus of this.strLoci) {
      if (locus === 'AMEL') {
        // Gender determination - inherit X from mother, X or Y from father
        const motherAllele = 'X';
        const fatherAllele = Math.random() > 0.5 ? 'X' : 'Y';
        child[locus] = [motherAllele, fatherAllele].sort();
      } else {
        // Regular STR inheritance
        const motherAlleles = mother[locus] || this.getRandomAlleles(locus, 2);
        const fatherAlleles = father[locus] || this.getRandomAlleles(locus, 2);

        // Child inherits one allele from each parent
        const inheritedFromMother = motherAlleles[Math.floor(Math.random() * motherAlleles.length)];
        const inheritedFromFather = fatherAlleles[Math.floor(Math.random() * fatherAlleles.length)];

        child[locus] = [inheritedFromMother, inheritedFromFather].sort();
      }
    }

    return child;
  }

  /**
   * Generate random STR profile
   */
  generateRandomProfile(type) {
    const profile = {};

    for (const locus of this.strLoci) {
      if (locus === 'AMEL') {
        // Gender marker
        if (type === 'mother') {
          profile[locus] = ['X', 'X'];
        } else if (type === 'father') {
          profile[locus] = ['X', 'Y'];
        } else {
          profile[locus] = Math.random() > 0.5 ? ['X', 'X'] : ['X', 'Y'];
        }
      } else {
        profile[locus] = this.getRandomAlleles(locus, 2);
      }
    }

    return profile;
  }

  /**
   * Get random alleles for a locus
   */
  getRandomAlleles(locus, count) {
    const availableAlleles = this.alleleRanges[locus] || ['10', '11', '12', '13'];
    const alleles = [];

    for (let i = 0; i < count; i++) {
      const randomAllele = availableAlleles[Math.floor(Math.random() * availableAlleles.length)];
      alleles.push(randomAllele);
    }

    return alleles.sort();
  }

  /**
   * Generate positive control profile
   */
  generateControlProfile() {
    // Use known control DNA profile (9947A)
    return {
      'D3S1358': ['15', '16'],
      'vWA': ['17', '18'],
      'D16S539': ['11', '12'],
      'CSF1PO': ['10', '12'],
      'TPOX': ['8', '11'],
      'D8S1179': ['13', '14'],
      'D21S11': ['30', '32.2'],
      'D18S51': ['13', '19'],
      'D2S441': ['11', '14'],
      'D19S433': ['13', '14'],
      'TH01': ['6', '9.3'],
      'FGA': ['23', '24'],
      'D22S1045': ['15', '16'],
      'D5S818': ['11', '12'],
      'D13S317': ['11', '12'],
      'D7S820': ['10', '11'],
      'AMEL': ['X', 'Y']
    };
  }

  /**
   * Generate negative control profile (no DNA)
   */
  generateNegativeControlProfile() {
    const profile = {};
    
    // Negative control should show no alleles or very low-level artifacts
    for (const locus of this.strLoci) {
      profile[locus] = []; // No alleles detected
    }

    return profile;
  }

  /**
   * Generate allelic ladder profile
   */
  generateLadderProfile() {
    const profile = {};
    
    // Ladder contains all common alleles for sizing
    for (const locus of this.strLoci) {
      if (locus === 'AMEL') {
        profile[locus] = ['X', 'Y'];
      } else {
        profile[locus] = this.alleleRanges[locus].slice(0, 8); // Representative alleles
      }
    }

    return profile;
  }

  /**
   * Generate realistic FSA binary file
   */
  async generateFSAFile(filePath, sample) {
    // Create a realistic FSA file structure
    const fsaData = this.createFSABinaryData(sample);
    await fs.writeFile(filePath, fsaData);
  }

  /**
   * Create FSA binary data structure
   */
  createFSABinaryData(sample) {
    // Calculate required buffer size (header + directory + data)
    const headerSize = 128;
    const directorySize = 50 * 28; // 50 entries * 28 bytes each
    const dataSize = 4 * 5000 * 2; // 4 channels * 5000 points * 2 bytes
    const metadataSize = 1000; // Space for strings and metadata
    const totalSize = headerSize + directorySize + dataSize + metadataSize;
    
    const buffer = Buffer.alloc(totalSize);
    let offset = 0;

    // ABIF signature
    buffer.write('ABIF', offset, 4, 'ascii');
    offset += 4;

    // Version
    buffer.writeUInt16BE(101, offset);
    offset += 2;

    // Directory offset (fixed at 128)
    buffer.writeUInt32BE(128, 26);

    // Number of directory entries
    const numEntries = 10; // Reduced number of entries
    buffer.writeUInt32BE(numEntries, 18);

    // Fill header to directory start (128 bytes)
    offset = 128;

    // Write directory entries
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = offset + (i * 28);
      
      // Sample tag names and data
      switch(i) {
        case 0:
          buffer.write('SMPL', entryOffset, 4, 'ascii'); // Sample name
          buffer.writeUInt32BE(1, entryOffset + 4); // Tag number
          buffer.writeUInt16BE(19, entryOffset + 8); // pString type
          buffer.writeUInt16BE(1, entryOffset + 10); // Element size
          buffer.writeUInt32BE(sample.name.length, entryOffset + 12); // Num elements
          buffer.writeUInt32BE(sample.name.length, entryOffset + 16); // Data size
          buffer.writeUInt32BE(1500, entryOffset + 20); // Data offset
          break;
          
        case 1:
          buffer.write('RUND', entryOffset, 4, 'ascii'); // Run date
          buffer.writeUInt32BE(1, entryOffset + 4);
          buffer.writeUInt16BE(19, entryOffset + 8);
          buffer.writeUInt16BE(1, entryOffset + 10);
          const dateStr = new Date().toISOString().substring(0, 19);
          buffer.writeUInt32BE(dateStr.length, entryOffset + 12);
          buffer.writeUInt32BE(dateStr.length, entryOffset + 16);
          buffer.writeUInt32BE(1600, entryOffset + 20);
          break;

        case 2:
          buffer.write('MCHN', entryOffset, 4, 'ascii'); // Machine name
          buffer.writeUInt32BE(1, entryOffset + 4);
          buffer.writeUInt16BE(19, entryOffset + 8);
          buffer.writeUInt16BE(1, entryOffset + 10);
          buffer.writeUInt32BE(12, entryOffset + 12);
          buffer.writeUInt32BE(12, entryOffset + 16);
          buffer.writeUInt32BE(1650, entryOffset + 20);
          break;

        case 3:
        case 4:
        case 5:
        case 6:
          // DATA entries for trace data (4 channels)
          if (i <= 6) {
            buffer.write('DATA', entryOffset, 4, 'ascii');
            buffer.writeUInt32BE(i - 2, entryOffset + 4); // Channel number
            buffer.writeUInt16BE(4, entryOffset + 8); // short type
            buffer.writeUInt16BE(2, entryOffset + 10); // 2 bytes per element
            buffer.writeUInt32BE(5000, entryOffset + 12); // 5000 data points
            buffer.writeUInt32BE(10000, entryOffset + 16); // 10000 bytes
            buffer.writeUInt32BE(2000 + ((i - 3) * 10000), entryOffset + 20); // Data offset
          }
          break;

        default:
          // Fill remaining entries with dummy data
          buffer.write('DUMI', entryOffset, 4, 'ascii');
          buffer.writeUInt32BE(i, entryOffset + 4);
          buffer.writeUInt16BE(1, entryOffset + 8);
          buffer.writeUInt16BE(1, entryOffset + 10);
          buffer.writeUInt32BE(1, entryOffset + 12);
          buffer.writeUInt32BE(1, entryOffset + 16);
          buffer.writeUInt32BE(1000, entryOffset + 20);
      }
    }

    // Write sample name at offset 1500
    if (1500 + sample.name.length < buffer.length) {
      buffer.write(sample.name, 1500, sample.name.length, 'ascii');
    }

    // Write run date at offset 1600
    const dateStr = new Date().toISOString().substring(0, 19);
    if (1600 + dateStr.length < buffer.length) {
      buffer.write(dateStr, 1600, dateStr.length, 'ascii');
    }

    // Write machine name at offset 1650
    if (1650 + 10 < buffer.length) {
      buffer.write('3130xl_001', 1650, 10, 'ascii');
    }

    // Generate synthetic electropherogram data for 4 channels
    for (let channel = 0; channel < 4; channel++) {
      const dataOffset = 2000 + (channel * 10000);
      
      for (let i = 0; i < 5000; i++) {
        const writeOffset = dataOffset + (i * 2);
        
        // Check bounds before writing
        if (writeOffset + 2 > buffer.length) break;
        
        // Generate synthetic peaks based on STR profile
        let intensity = Math.random() * 50 + 10; // Baseline noise
        
        // Add peaks for this sample's alleles
        if (sample.profile) {
          const channelLoci = this.getChannelLoci(channel);
          for (const locus of channelLoci) {
            const alleles = sample.profile[locus] || [];
            for (const allele of alleles) {
              const expectedPosition = this.getAllelePosition(locus, allele, 5000);
              const distance = Math.abs(i - expectedPosition);
              if (distance < 50) {
                intensity += this.calculatePeakIntensity(distance, sample.type);
              }
            }
          }
        }

        buffer.writeInt16BE(Math.min(Math.max(Math.round(intensity), 0), 32767), writeOffset);
      }
    }

    return buffer;
  }

  /**
   * Get loci assigned to each fluorescent channel
   */
  getChannelLoci(channel) {
    const channelAssignments = {
      0: ['D3S1358', 'TH01', 'D21S11', 'D18S51', 'D10S1248'], // FAM (Blue)
      1: ['vWA', 'D8S1179', 'D2S441', 'D16S539'], // VIC (Green)  
      2: ['D16S539', 'CSF1PO', 'D7S820', 'D13S317'], // NED (Yellow)
      3: ['AMEL', 'D19S433', 'TPOX', 'FGA'] // PET (Red)
    };
    
    return channelAssignments[channel] || [];
  }

  /**
   * Calculate expected position for an allele
   */
  getAllelePosition(locus, allele, maxPosition = 5000) {
    // Simplified size-to-position mapping
    const baseSizes = {
      'D3S1358': 112, 'vWA': 157, 'D16S539': 250, 'CSF1PO': 305,
      'TPOX': 224, 'D8S1179': 128, 'D21S11': 189, 'D18S51': 273,
      'D2S441': 310, 'D19S433': 103, 'TH01': 179, 'FGA': 219,
      'AMEL': 106
    };

    const baseSize = baseSizes[locus] || 200;
    const alleleValue = parseFloat(allele) || 10;
    const estimatedSize = baseSize + (alleleValue * 4); // 4bp per repeat
    
    // Convert size to scan position (approximate) and constrain to maxPosition
    const position = Math.round((estimatedSize - 50) * (maxPosition / 600)); // Scale to fit
    return Math.min(Math.max(position, 100), maxPosition - 100); // Keep within bounds
  }

  /**
   * Calculate peak intensity based on distance and sample type
   */
  calculatePeakIntensity(distance, sampleType) {
    if (sampleType === 'negative_control') return 0;
    if (sampleType === 'allelic_ladder') return Math.exp(-distance / 20) * 500;
    
    // Gaussian peak shape
    const maxHeight = 1000 + Math.random() * 2000;
    return Math.exp(-(distance * distance) / 100) * maxHeight;
  }
}

// Main execution
async function main() {
  const generator = new SampleFSAGenerator();
  
  try {
    // Generate multiple test cases
    const cases = ['PT001', 'PT002', 'PT003'];
    
    for (const caseId of cases) {
      const result = await generator.generatePaternityCase(caseId);
      if (result.success) {
        console.log(`\n📋 Case ${caseId} Summary:`);
        console.log(`   Generated: ${result.files.length} files`);
        console.log(`   Kit: ${result.metadata.kit}`);
        console.log(`   Instrument: ${result.metadata.instrument}`);
      }
    }

    console.log(`\n🎉 Sample FSA generation complete!`);
    console.log(`📁 Files saved to: ${generator.outputDir}`);
    console.log(`\n💡 Usage: Upload these .fsa files through the LIMS interface`);
    console.log(`   for OSIRIS analysis testing and demonstration.`);

  } catch (error) {
    console.error('❌ Error generating sample files:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SampleFSAGenerator;