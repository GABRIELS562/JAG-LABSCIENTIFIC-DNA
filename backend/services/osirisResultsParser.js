const OsirisResultsCache = require('./osirisResultsCache');

class OsirisResultsParser {
  constructor() {
    try {
      // Initialize the cache system instead of direct file access
      this.cache = new OsirisResultsCache();
      console.log('🔄 OsirisResultsParser now using cached results system');
    } catch (error) {
      console.error('❌ Error initializing OsirisResultsCache:', error.message);
      // Fallback: don't use cache if initialization fails
      this.cache = null;
    }
  }

  /**
   * Get the latest analysis results from cache
   */
  async getLatestResults() {
    try {
      console.log('📊 Fetching cached Osiris results...');
      
      // Check if cache is available
      if (!this.cache) {
        console.log('📝 Cache not available, using mock data');
        return this.getMockData();
      }
      
      // Try to get cached results first
      const cachedResults = await this.cache.getCachedResults();
      
      if (cachedResults) {
        console.log('✅ Returning cached results');
        return cachedResults;
      }
      
      // No cached results available, return mock data
      console.log('📝 No cached results found, using mock data');
      return this.getMockData();
      
    } catch (error) {
      console.error('❌ Error getting cached results:', error.message);
      console.log('🔄 Falling back to mock data');
      return this.getMockData();
    }
  }

  /**
   * Start monitoring Osiris output for new results
   */
  async startMonitoring() {
    try {
      if (this.cache) {
        await this.cache.startMonitoring();
        console.log('👁️ Started monitoring Osiris for new results');
      } else {
        console.log('⚠️ Cache not available, skipping Osiris monitoring');
      }
    } catch (error) {
      console.error('❌ Error starting Osiris monitoring:', error);
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    try {
      if (this.cache) {
        await this.cache.stopMonitoring();
        console.log('🛑 Stopped monitoring Osiris');
      }
    } catch (error) {
      console.error('❌ Error stopping Osiris monitoring:', error);
    }
  }

  /**
   * Mock data for when no real results exist
   */
  getMockData() {
    return {
      isRealData: false,
      source: 'Mock demonstration data',
      overallStatus: 'completed',
      totalSamples: 6,
      successfulAnalyses: 5,
      requiresReview: 1,
      analysisTime: '8 minutes 42 seconds',
      kit: 'Identifiler Plus',
      runDate: new Date().toLocaleDateString(),
      samples: [
        {
          name: '25_001_Child_ID',
          status: 'success',
          confidence: 99.8,
          lociDetected: 16,
          issues: []
        },
        {
          name: '25_002_Father_ID', 
          status: 'success',
          confidence: 99.9,
          lociDetected: 16,
          issues: []
        },
        {
          name: '25_003_Mother_ID',
          status: 'success', 
          confidence: 99.7,
          lociDetected: 16,
          issues: []
        },
        {
          name: 'Positive_Control_ID',
          status: 'success',
          confidence: 99.9,
          lociDetected: 16,
          issues: []
        },
        {
          name: 'Negative_Control_ID',
          status: 'warning',
          confidence: 85.2,
          lociDetected: 14,
          issues: ['Low RFU on D3S1358', 'Possible contamination']
        },
        {
          name: 'LADDER_ID',
          status: 'success',
          confidence: 100.0,
          lociDetected: 16,
          issues: []
        }
      ],
      strComparison: this.generateMockSTRComparison(),
      qualityMetrics: {
        averageRFU: 2847,
        peakBalance: 'Good',
        stutterRatio: '12.3%',
        noiseLevel: 'Low'
      }
    };
  }

  /**
   * Generate mock STR comparison data
   */
  generateMockSTRComparison() {
    const mockData = [
      { locus: 'AMEL', mother: 'X X', child: 'X Y', allegedFather: 'X Y', result: '✓' },
      { locus: 'CSF1PO', mother: '9 10', child: '11 12', allegedFather: '11 12', result: '✗' },
      { locus: 'D13S317', mother: '12 14', child: '12 13', allegedFather: '12 13', result: '✓' },
      { locus: 'D16S539', mother: '9 12', child: '11 11', allegedFather: '11 11', result: '✗' },
      { locus: 'D18S51', mother: '14 19', child: '13 14', allegedFather: '13 14', result: '✓' },
      { locus: 'D19S433', mother: '14 15.2', child: '14 15.2', allegedFather: '14 15.2', result: '✓' },
      { locus: 'D21S11', mother: '30 30', child: '31 33', allegedFather: '31 33', result: '✗' },
      { locus: 'D2S1338', mother: '21 24', child: '16 17', allegedFather: '16 17', result: '✗' },
      { locus: 'D3S1358', mother: '16 17', child: '17 18', allegedFather: '17 18', result: '✓' },
      { locus: 'D5S818', mother: '11 13', child: '12 13', allegedFather: '12 13', result: '✓' },
      { locus: 'D7S820', mother: '10 11', child: '9 12', allegedFather: '9 12', result: '✗' },
      { locus: 'D8S1179', mother: '13 14', child: '10 15', allegedFather: '10 15', result: '✗' },
      { locus: 'FGA', mother: '22 26', child: '22 23', allegedFather: '22 23', result: '✓' },
      { locus: 'TH01', mother: '7 10', child: '8 9', allegedFather: '8 9', result: '✗' },
      { locus: 'TPOX', mother: '9 10', child: '6 11', allegedFather: '6 11', result: '✗' },
      { locus: 'vWA', mother: '15 16', child: '15 17', allegedFather: '15 17', result: '✓' }
    ];

    return {
      motherName: '25_003_Mother_ID',
      childName: '25_001_Child_ID', 
      allegedFatherName: '25_002_Father_ID',
      loci: mockData,
      overallConclusion: {
        conclusion: 'EXCLUSION',
        probability: '0%',
        interpretation: 'Alleged father is excluded as the biological father (8 exclusions)'
      },
      inclusionProbability: 0.0
    };
  }
}

module.exports = OsirisResultsParser;