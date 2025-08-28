/**
 * OSIRIS Simulation Service
 * Simulates OSIRIS STR Analysis for 3500 Genetic Analyzer
 * PowerPlex ESX 17 STR Kit with LIZ 500 Size Standard
 */

// PowerPlex ESX 17 STR Loci Configuration
const POWERPLEX_ESX17_LOCI = {
  // Blue Channel (FL)
  D3S1358: { channel: 'FL', range: [98, 150], alleles: [12, 13, 14, 15, 16, 17, 18, 19, 20] },
  D16S539: { channel: 'FL', range: [234, 274], alleles: [5, 8, 9, 10, 11, 12, 13, 14, 15] },
  D2S1338: { channel: 'FL', range: [289, 341], alleles: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
  
  // Green Channel (JOE)
  D8S1179: { channel: 'JOE', range: [123, 175], alleles: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
  D21S11: { channel: 'JOE', range: [185, 243], alleles: [24, 24.2, 25, 26, 27, 28, 28.2, 29, 29.2, 30, 30.2, 31, 31.2, 32, 32.2, 33, 33.2, 34, 34.2, 35, 35.2, 36, 37, 38] },
  D18S51: { channel: 'JOE', range: [264, 344], alleles: [7, 8, 9, 10, 10.2, 11, 12, 13, 13.2, 14, 14.2, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] },
  
  // Yellow Channel (TMR-ET)
  D10S1248: { channel: 'TMR', range: [80, 107], alleles: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
  vWA: { channel: 'TMR', range: [114, 168], alleles: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
  FGA: { channel: 'TMR', range: [196, 330], alleles: [17, 18, 18.2, 19, 19.2, 20, 20.2, 21, 21.2, 22, 22.2, 23, 23.2, 24, 24.2, 25, 26, 26.2, 27, 28, 29, 30, 30.2, 31.2, 32.2, 33.2, 42.2, 43.2, 44.2, 45.2, 46.2, 47.2, 48.2, 50.2, 51.2] },
  
  // Red Channel (CXR-ET) 
  D22S1045: { channel: 'CXR', range: [89, 101], alleles: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
  D5S818: { channel: 'CXR', range: [134, 172], alleles: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
  D13S317: { channel: 'CXR', range: [193, 225], alleles: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
  D7S820: { channel: 'CXR', range: [253, 291], alleles: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
  
  // Orange Channel (CC5) - Sex determination
  AMEL: { channel: 'CC5', range: [75, 85], alleles: ['X', 'Y'] },
  D1S1656: { channel: 'CC5', range: [178, 225], alleles: [9, 10, 11, 12, 13, 14, 15, 15.3, 16, 16.3, 17, 17.3, 18, 18.3, 19, 19.3, 20] },
  D12S391: { channel: 'CC5', range: [233, 269], alleles: [15, 16, 17, 17.3, 18, 18.3, 19, 19.3, 20, 21, 22, 23, 24, 25, 26, 27] },
  D2S441: { channel: 'CC5', range: [309, 357], alleles: [8, 9, 10, 11, 11.3, 12, 13, 14, 15, 16] },
  D19S433: { channel: 'CC5', range: [391, 433], alleles: [9, 10, 11, 12, 12.2, 13, 13.2, 14, 14.2, 15, 15.2, 16, 16.2, 17, 17.2] }
};

// LIZ 500 Size Standard peaks (in base pairs)
const LIZ_500_PEAKS = [75, 100, 139, 150, 160, 200, 250, 300, 340, 350, 400, 450, 490, 500];

// Generate random allele for a locus
function generateAllele(locus) {
  const config = POWERPLEX_ESX17_LOCI[locus];
  const alleles = config.alleles;
  return alleles[Math.floor(Math.random() * alleles.length)];
}

// Generate STR profile for a person
function generateSTRProfile(sex = null) {
  const profile = {};
  
  // Determine sex randomly if not specified
  if (!sex) {
    sex = Math.random() < 0.5 ? 'male' : 'female';
  }
  
  // Generate alleles for each locus
  for (const locus in POWERPLEX_ESX17_LOCI) {
    if (locus === 'AMEL') {
      // Handle sex chromosomes
      profile[locus] = sex === 'male' ? ['X', 'Y'] : ['X', 'X'];
    } else {
      // Generate two alleles (can be homozygous or heterozygous)
      const allele1 = generateAllele(locus);
      const allele2 = Math.random() < 0.3 ? allele1 : generateAllele(locus); // 30% homozygous
      profile[locus] = [allele1, allele2].sort((a, b) => a - b);
    }
  }
  
  return { profile, sex };
}

// Calculate paternity index for a single locus
function calculateLocusPI(child, mother, alleged) {
  // Simplified PI calculation
  // In real OSIRIS, this would use population frequencies
  if (!child || !mother || !alleged) return 0;
  
  const childAlleles = child;
  const motherAlleles = mother;
  const allegedAlleles = alleged;
  
  // Check if alleged father could contribute paternal allele
  let maternalAllele = null;
  let paternalAllele = null;
  
  // Determine which allele came from mother
  for (const allele of childAlleles) {
    if (motherAlleles.includes(allele)) {
      maternalAllele = allele;
      break;
    }
  }
  
  // The other allele must be paternal
  paternalAllele = childAlleles.find(a => a !== maternalAllele);
  
  // Check if alleged father has the paternal allele
  if (allegedAlleles.includes(paternalAllele)) {
    // Simplified PI (real calculation uses frequency data)
    return allegedAlleles[0] === allegedAlleles[1] ? 50 : 25;
  }
  
  return 0.001; // Exclusion
}

// Calculate Combined Paternity Index (CPI)
function calculateCPI(childProfile, motherProfile, allegedProfile) {
  let cpi = 1;
  const locusResults = {};
  
  for (const locus in POWERPLEX_ESX17_LOCI) {
    if (locus === 'AMEL') continue; // Skip sex locus
    
    const pi = calculateLocusPI(
      childProfile[locus],
      motherProfile[locus],
      allegedProfile[locus]
    );
    
    locusResults[locus] = pi;
    cpi *= pi;
  }
  
  return { cpi, locusResults };
}

// Generate OSIRIS analysis results
export function generateOsirisResults(sampleId, sampleType = 'paternity') {
  const timestamp = new Date().toISOString();
  
  // Generate profiles
  const childProfile = generateSTRProfile();
  const motherProfile = generateSTRProfile('female');
  
  // For paternity test, generate alleged father profile
  // 70% chance of being biological father
  const isBiologicalFather = Math.random() < 0.7;
  let allegedProfile;
  
  if (isBiologicalFather) {
    // Generate compatible profile
    allegedProfile = { profile: {}, sex: 'male' };
    for (const locus in POWERPLEX_ESX17_LOCI) {
      if (locus === 'AMEL') {
        allegedProfile.profile[locus] = ['X', 'Y'];
      } else {
        // Ensure at least one allele matches the paternal allele
        const childAlleles = childProfile.profile[locus];
        const motherAlleles = motherProfile.profile[locus];
        
        // Find paternal allele
        let paternalAllele = childAlleles[0];
        if (motherAlleles.includes(childAlleles[0])) {
          paternalAllele = childAlleles[1];
        }
        
        const allegedAllele1 = paternalAllele;
        const allegedAllele2 = Math.random() < 0.5 ? paternalAllele : generateAllele(locus);
        allegedProfile.profile[locus] = [allegedAllele1, allegedAllele2].sort((a, b) => a - b);
      }
    }
  } else {
    allegedProfile = generateSTRProfile('male');
  }
  
  // Calculate CPI and probability
  const { cpi, locusResults } = calculateCPI(
    childProfile.profile,
    motherProfile.profile,
    allegedProfile.profile
  );
  
  const probability = (cpi / (cpi + 1)) * 100;
  const conclusion = probability > 99.9 ? 'INCLUSION' : 'EXCLUSION';
  const exclusions = Object.values(locusResults).filter(pi => pi < 1).length;
  
  return {
    analysisId: `OSR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sampleId,
    timestamp,
    status: 'completed',
    software: 'OSIRIS v2.17',
    kit: 'PowerPlex ESX 17',
    sizeStandard: 'LIZ 500',
    instrument: '3500 Genetic Analyzer',
    runParameters: {
      injection: {
        voltage: 1600,
        time: 10,
        temperature: 60
      },
      separation: {
        voltage: 15000,
        time: 1500,
        temperature: 60
      },
      polymer: 'POP-4',
      capillaryLength: 36
    },
    profiles: {
      child: childProfile,
      mother: motherProfile,
      allegedFather: allegedProfile
    },
    results: {
      locusResults,
      cpi: cpi.toExponential(2),
      probability: probability.toFixed(4),
      conclusion,
      exclusions,
      qualityMetrics: {
        RFU: {
          min: 150,
          max: 8000,
          average: 2500
        },
        peakHeightRatio: 0.65,
        stutterRatio: 0.10,
        pullUpPercentage: 2.3,
        resolutionScore: 0.95
      }
    },
    artifacts: {
      stutter: exclusions > 0 ? Math.floor(Math.random() * 3) : 0,
      pullUp: Math.floor(Math.random() * 2),
      offLadder: 0,
      spikes: Math.floor(Math.random() * 2)
    },
    validation: {
      allLadderPeaksDetected: true,
      sizingQuality: 'PASS',
      controlsValid: true,
      negativeControlClean: true
    }
  };
}

// Generate batch analysis results
export function generateBatchResults(batchId, sampleCount = 96) {
  const samples = [];
  const startTime = new Date();
  
  for (let i = 1; i <= sampleCount; i++) {
    const wellPosition = `${String.fromCharCode(65 + Math.floor((i-1) / 12))}${((i-1) % 12) + 1}`;
    const sampleId = `${batchId}-${wellPosition}`;
    
    // Add some variety in sample types
    let sampleType = 'unknown';
    if (i <= 3) sampleType = 'positive_control';
    else if (i === 4) sampleType = 'negative_control';
    else if (i % 24 === 0) sampleType = 'ladder';
    
    samples.push({
      wellPosition,
      sampleId,
      sampleType,
      status: 'completed',
      results: sampleType === 'unknown' ? generateOsirisResults(sampleId) : null
    });
  }
  
  const endTime = new Date();
  const processingTime = (endTime - startTime) / 1000; // seconds
  
  return {
    batchId,
    timestamp: startTime.toISOString(),
    completedAt: endTime.toISOString(),
    processingTime: `${processingTime.toFixed(1)}s`,
    totalSamples: sampleCount,
    successfulSamples: sampleCount - Math.floor(Math.random() * 3),
    failedSamples: Math.floor(Math.random() * 3),
    samples,
    plateLayout: '96-well',
    runMetrics: {
      averageResolution: 0.94,
      averageRFU: 2450,
      sizingQualityScore: 0.96,
      successRate: ((sampleCount - Math.floor(Math.random() * 3)) / sampleCount * 100).toFixed(1)
    }
  };
}

// Simulate OSIRIS processing queue
export function simulateOsirisQueue() {
  const queue = [];
  const statuses = ['pending', 'processing', 'completed', 'failed', 'review'];
  
  for (let i = 1; i <= 5; i++) {
    queue.push({
      id: `Q-${Date.now()}-${i}`,
      batchId: `BATCH-2024-${String(i).padStart(3, '0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: Math.floor(Math.random() * 3) + 1,
      samples: 96,
      submittedBy: 'Lab Technician',
      submittedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      estimatedCompletion: new Date(Date.now() + Math.random() * 3600000).toISOString()
    });
  }
  
  return queue;
}

// Also export constants
export { POWERPLEX_ESX17_LOCI, LIZ_500_PEAKS };