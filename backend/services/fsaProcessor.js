const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FSAProcessor {
  constructor() {
    this.supportedVersions = ['3.0', '3.1', '3.2'];
    this.requiredTags = ['DATA', 'FWO_', 'DYEP', 'LANE', 'RUNT', 'SCAN'];
  }

  /**
   * Validate and parse .fsa file from ABI 3130xl
   * @param {string} filePath - Path to the .fsa file
   * @returns {Object} Parsed file data with metadata and electropherogram data
   */
  async processFSAFile(filePath) {
    try {
      console.log(`Processing FSA file: ${filePath}`);
      
      // Validate file exists and has correct extension
      await this.validateFile(filePath);
      
      // Read and parse binary data
      const buffer = await fs.readFile(filePath);
      const fileData = this.parseFSABinary(buffer);
      
      // Extract metadata
      const metadata = this.extractMetadata(fileData);
      
      // Validate data quality
      const qualityCheck = this.performQualityControl(fileData);
      
      // Generate file hash for integrity
      const fileHash = this.generateFileHash(buffer);
      
      return {
        success: true,
        filePath,
        fileHash,
        metadata,
        qualityCheck,
        electropherogramData: fileData.traces,
        sampleData: {
          sampleName: metadata.sampleName,
          runDate: metadata.runDate,
          instrument: metadata.instrument,
          kit: metadata.kit,
          injectionTime: metadata.injectionTime
        },
        rawData: fileData
      };
      
    } catch (error) {
      console.error(`Error processing FSA file ${filePath}:`, error.message);
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Validate file format and accessibility
   */
  async validateFile(filePath) {
    const stats = await fs.stat(filePath);
    
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }
    
    if (path.extname(filePath).toLowerCase() !== '.fsa') {
      throw new Error('File must have .fsa extension');
    }
    
    if (stats.size < 1000) {
      throw new Error('File appears to be too small to be a valid FSA file');
    }
    
    if (stats.size > 100 * 1024 * 1024) {
      throw new Error('File is too large (>100MB)');
    }
  }

  /**
   * Parse FSA binary format
   */
  parseFSABinary(buffer) {
    const data = {
      header: {},
      directory: {},
      traces: {},
      metadata: {},
      buffer: buffer // Store buffer reference for metadata extraction
    };

    // Parse ABIF header (first 128 bytes)
    const signature = buffer.toString('ascii', 0, 4);
    if (signature !== 'ABIF') {
      throw new Error('Invalid FSA file - missing ABIF signature');
    }

    const version = buffer.readUInt16BE(4);
    const directoryOffset = buffer.readUInt32BE(26);
    const directoryEntries = buffer.readUInt32BE(18);

    data.header = {
      signature,
      version,
      directoryOffset,
      directoryEntries
    };

    // Parse directory entries
    this.parseDirectoryEntries(buffer, data, directoryOffset, directoryEntries);
    
    // Extract trace data for each dye
    this.extractTraceData(buffer, data);
    
    return data;
  }

  /**
   * Parse directory entries to find data locations
   */
  parseDirectoryEntries(buffer, data, offset, numEntries) {
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = offset + (i * 28);
      
      const tagName = buffer.toString('ascii', entryOffset, entryOffset + 4);
      const tagNumber = buffer.readUInt32BE(entryOffset + 4);
      const elementType = buffer.readUInt16BE(entryOffset + 8);
      const elementSize = buffer.readUInt16BE(entryOffset + 10);
      const numElements = buffer.readUInt32BE(entryOffset + 12);
      const dataSize = buffer.readUInt32BE(entryOffset + 16);
      const dataOffset = buffer.readUInt32BE(entryOffset + 20);

      const key = `${tagName}_${tagNumber}`;
      data.directory[key] = {
        tagName,
        tagNumber,
        elementType,
        elementSize,
        numElements,
        dataSize,
        dataOffset
      };
    }
  }

  /**
   * Extract electropherogram trace data
   */
  extractTraceData(buffer, data) {
    const traces = {};
    const dyeNames = ['FAM', 'VIC', 'NED', 'PET']; // Common dye set for STR analysis
    
    // Look for DATA entries (trace data)
    for (let i = 1; i <= 4; i++) {
      const dataKey = `DATA_${i}`;
      if (data.directory[dataKey]) {
        const entry = data.directory[dataKey];
        const traceData = this.readTraceData(buffer, entry);
        traces[dyeNames[i-1] || `Channel_${i}`] = traceData;
      }
    }
    
    data.traces = traces;
  }

  /**
   * Read trace data from buffer
   */
  readTraceData(buffer, entry) {
    const trace = [];
    const { dataOffset, numElements } = entry;
    
    for (let i = 0; i < numElements; i++) {
      const value = buffer.readInt16BE(dataOffset + (i * 2));
      trace.push(value);
    }
    
    return trace;
  }

  /**
   * Extract metadata from parsed data
   */
  extractMetadata(fileData) {
    const metadata = {};
    
    // Extract sample name
    if (fileData.directory['SMPL_1']) {
      const entry = fileData.directory['SMPL_1'];
      metadata.sampleName = this.extractStringData(fileData.buffer, entry) || 'Unknown';
    }
    
    // Extract run date/time
    if (fileData.directory['RUND_1']) {
      const entry = fileData.directory['RUND_1'];
      metadata.runDate = this.extractDateData(fileData.buffer, entry) || new Date();
    }
    
    // Extract instrument info
    if (fileData.directory['MCHN_1']) {
      const entry = fileData.directory['MCHN_1'];
      metadata.instrument = this.extractStringData(fileData.buffer, entry) || 'ABI_3130xl';
    }
    
    // Extract kit information
    if (fileData.directory['KITV_1']) {
      const entry = fileData.directory['KITV_1'];
      metadata.kit = this.extractStringData(fileData.buffer, entry) || 'PowerPlex_ESX_17';
    }
    
    // Extract injection parameters
    if (fileData.directory['InVt_1']) {
      const entry = fileData.directory['InVt_1'];
      metadata.injectionVoltage = this.extractNumericData(fileData.buffer, entry);
    }
    
    if (fileData.directory['InTm_1']) {
      const entry = fileData.directory['InTm_1'];
      metadata.injectionTime = this.extractNumericData(fileData.buffer, entry);
    }
    
    // Extract voltage and current parameters
    if (fileData.directory['RVlt_1']) {
      const entry = fileData.directory['RVlt_1'];
      metadata.runVoltage = this.extractNumericData(fileData.buffer, entry);
    }
    
    if (fileData.directory['Curr_1']) {
      const entry = fileData.directory['Curr_1'];
      metadata.current = this.extractNumericData(fileData.buffer, entry);
    }
    
    // Extract temperature
    if (fileData.directory['Temp_1']) {
      const entry = fileData.directory['Temp_1'];
      metadata.temperature = this.extractNumericData(fileData.buffer, entry);
    }
    
    // Extract polymer information
    if (fileData.directory['Polm_1']) {
      const entry = fileData.directory['Polm_1'];
      metadata.polymer = this.extractStringData(fileData.buffer, entry) || 'POP-7';
    }
    
    // Extract capillary length
    if (fileData.directory['CapL_1']) {
      const entry = fileData.directory['CapL_1'];
      metadata.capillaryLength = this.extractNumericData(fileData.buffer, entry);
    }
    
    return metadata;
  }

  /**
   * Extract string data from buffer
   */
  extractStringData(buffer, entry) {
    try {
      if (entry.dataSize <= 4) {
        // Data is stored inline in the directory entry
        return buffer.toString('ascii', entry.dataOffset, entry.dataOffset + entry.dataSize).replace(/\0/g, '');
      } else {
        // Data is stored at offset
        return buffer.toString('ascii', entry.dataOffset, entry.dataOffset + entry.dataSize).replace(/\0/g, '');
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract numeric data from buffer
   */
  extractNumericData(buffer, entry) {
    try {
      switch (entry.elementType) {
        case 1: // byte
          return buffer.readUInt8(entry.dataOffset);
        case 2: // char
          return buffer.readInt8(entry.dataOffset);
        case 3: // word (unsigned short)
          return buffer.readUInt16BE(entry.dataOffset);
        case 4: // short
          return buffer.readInt16BE(entry.dataOffset);
        case 5: // long (unsigned int)
          return buffer.readUInt32BE(entry.dataOffset);
        case 6: // rational (not implemented)
          return null;
        case 7: // float
          return buffer.readFloatBE(entry.dataOffset);
        case 8: // double
          return buffer.readDoubleBE(entry.dataOffset);
        case 18: // pString
          return this.extractStringData(buffer, entry);
        case 19: // cString
          return this.extractStringData(buffer, entry);
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract date data from buffer
   */
  extractDateData(buffer, entry) {
    try {
      // ABI date format is typically a string
      const dateString = this.extractStringData(buffer, entry);
      if (dateString) {
        return new Date(dateString);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Perform quality control checks on the data
   */
  performQualityControl(fileData) {
    const qc = {
      passed: true,
      warnings: [],
      errors: [],
      metrics: {}
    };

    // Check if all required channels have data
    const expectedChannels = 4;
    const actualChannels = Object.keys(fileData.traces).length;
    
    if (actualChannels < expectedChannels) {
      qc.warnings.push(`Expected ${expectedChannels} channels, found ${actualChannels}`);
    }

    // Check trace data quality
    Object.entries(fileData.traces).forEach(([channel, trace]) => {
      const maxSignal = Math.max(...trace);
      const avgSignal = trace.reduce((a, b) => a + b, 0) / trace.length;
      
      qc.metrics[channel] = {
        maxSignal,
        avgSignal,
        dataPoints: trace.length
      };

      if (maxSignal < 100) {
        qc.warnings.push(`Low signal in ${channel}: ${maxSignal}`);
      }

      if (trace.length < 1000) {
        qc.warnings.push(`Short trace in ${channel}: ${trace.length} points`);
      }
    });

    qc.passed = qc.errors.length === 0;
    return qc;
  }

  /**
   * Generate file hash for integrity verification
   */
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Perform peak detection on electropherogram data
   */
  detectPeaks(traceData, minHeight = 100, minDistance = 10) {
    const peaks = [];
    const data = Array.isArray(traceData) ? traceData : traceData.data;
    
    for (let i = minDistance; i < data.length - minDistance; i++) {
      const currentValue = data[i];
      
      if (currentValue < minHeight) continue;
      
      // Check if this point is a local maximum
      let isLocalMax = true;
      for (let j = 1; j <= minDistance; j++) {
        if (data[i - j] >= currentValue || data[i + j] >= currentValue) {
          isLocalMax = false;
          break;
        }
      }
      
      if (isLocalMax) {
        peaks.push({
          position: i,
          height: currentValue,
          area: this.calculatePeakArea(data, i, minDistance),
          width: this.calculatePeakWidth(data, i, currentValue * 0.5)
        });
      }
    }
    
    return peaks.sort((a, b) => b.height - a.height);
  }

  /**
   * Calculate peak area using trapezoidal rule
   */
  calculatePeakArea(data, peakPosition, window = 20) {
    const start = Math.max(0, peakPosition - window);
    const end = Math.min(data.length - 1, peakPosition + window);
    
    let area = 0;
    for (let i = start; i < end; i++) {
      area += (data[i] + data[i + 1]) / 2;
    }
    
    return area;
  }

  /**
   * Calculate peak width at half maximum
   */
  calculatePeakWidth(data, peakPosition, halfMax) {
    let leftWidth = 0, rightWidth = 0;
    
    // Find left half-maximum point
    for (let i = peakPosition; i >= 0; i--) {
      if (data[i] <= halfMax) {
        leftWidth = peakPosition - i;
        break;
      }
    }
    
    // Find right half-maximum point
    for (let i = peakPosition; i < data.length; i++) {
      if (data[i] <= halfMax) {
        rightWidth = i - peakPosition;
        break;
      }
    }
    
    return leftWidth + rightWidth;
  }

  /**
   * Perform STR allele calling based on size standards
   */
  performAlleleCall(peaks, sizeStandard) {
    const alleles = [];
    
    // Create size calibration curve from internal size standard
    const sizeCalibration = this.createSizeCalibration(sizeStandard);
    
    for (const peak of peaks) {
      if (peak.height < 150) continue; // Analytical threshold
      
      const size = this.interpolateSize(peak.position, sizeCalibration);
      const allele = this.sizeToAllele(size);
      
      if (allele) {
        alleles.push({
          allele: allele,
          size: size,
          height: peak.height,
          area: peak.area,
          position: peak.position,
          quality: this.assessPeakQuality(peak)
        });
      }
    }
    
    return alleles;
  }

  /**
   * Create size calibration curve from internal size standard
   */
  createSizeCalibration(sizeStandard) {
    // Standard fragments for GS120LIZ size standard
    const standardFragments = [15, 50, 75, 100, 139, 150, 160, 200, 250, 300, 340, 350, 400, 450, 490, 500];
    
    // In real implementation, would detect peaks in size standard channel
    // and match them to known fragment sizes
    const calibrationPoints = [];
    
    for (let i = 0; i < standardFragments.length; i++) {
      calibrationPoints.push({
        position: 100 + (i * 200), // Mock positions
        size: standardFragments[i]
      });
    }
    
    return calibrationPoints;
  }

  /**
   * Interpolate fragment size from scan position
   */
  interpolateSize(position, calibration) {
    // Linear interpolation between calibration points
    for (let i = 0; i < calibration.length - 1; i++) {
      const p1 = calibration[i];
      const p2 = calibration[i + 1];
      
      if (position >= p1.position && position <= p2.position) {
        const ratio = (position - p1.position) / (p2.position - p1.position);
        return p1.size + ratio * (p2.size - p1.size);
      }
    }
    
    return null;
  }

  /**
   * Convert fragment size to STR allele designation
   */
  sizeToAllele(size) {
    // STR allele calling based on fragment size
    // This is a simplified version - real implementation would use
    // locus-specific size tables
    
    const alleleRanges = {
      'D3S1358': { start: 114, repeat: 4 },
      'vWA': { start: 157, repeat: 4 },
      'D16S539': { start: 250, repeat: 4 },
      'CSF1PO': { start: 305, repeat: 4 },
      'TPOX': { start: 224, repeat: 4 },
      'D8S1179': { start: 128, repeat: 4 },
      'D21S11': { start: 189, repeat: 4 },
      'D18S51': { start: 273, repeat: 4 },
      'D2S441': { start: 310, repeat: 4 },
      'D19S433': { start: 103, repeat: 4 },
      'TH01': { start: 179, repeat: 4 },
      'FGA': { start: 219, repeat: 4 }
    };
    
    // Simplified allele calling - in practice would need locus identification
    const roundedSize = Math.round(size);
    return roundedSize.toString();
  }

  /**
   * Assess peak quality for acceptance criteria
   */
  assessPeakQuality(peak) {
    let quality = 'Good';
    
    if (peak.height < 200) quality = 'Low';
    if (peak.width > 1.5) quality = 'Broad';
    if (peak.height > 5000) quality = 'Saturated';
    
    return quality;
  }

  /**
   * Process batch of FSA files
   */
  async processBatch(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      const result = await this.processFSAFile(filePath);
      results.push(result);
    }
    
    return {
      totalFiles: filePaths.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = FSAProcessor;