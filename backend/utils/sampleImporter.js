const db = require('../services/database');
const { logger } = require('../utils/logger');

/**
 * Import samples from client's tab-delimited format
 * Format: lab_number  name  surname  relation  collection_date  submission_date  mother_present  email  location  phone  kit_number  pcr_batch  electro_batch  analysis_date  comments
 */
class SampleImporter {
  constructor() {
    this.importStats = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Parse a single line of tab-delimited data
   */
  parseLine(line) {
    const fields = line.split('\t').map(f => f.trim());
    
    // Handle empty fields
    const getValue = (field) => {
      if (!field || field === '' || field === 'null' || field === 'undefined') {
        return null;
      }
      return field;
    };

    // Parse the relation field to extract gender and father's lab number
    const parseRelation = (relationStr) => {
      if (!relationStr) return { relation: null, gender: null, fatherLabNumber: null };
      
      // Check if it's a child with format: child(25_95) M
      const childMatch = relationStr.match(/child\((25_\d+)\)\s*([MF])?/i);
      if (childMatch) {
        return {
          relation: 'child',
          gender: childMatch[2] || null,
          fatherLabNumber: childMatch[1]
        };
      }
      
      // Check if it's Alleged Father
      if (relationStr.toLowerCase().includes('alleged father')) {
        return {
          relation: 'alleged_father',
          gender: 'M',
          fatherLabNumber: null
        };
      }
      
      // Check if it's Mother
      if (relationStr.toLowerCase().includes('mother')) {
        return {
          relation: 'mother',
          gender: 'F',
          fatherLabNumber: null
        };
      }
      
      return { relation: relationStr, gender: null, fatherLabNumber: null };
    };

    const relationData = parseRelation(fields[3]);
    
    // Format dates to YYYY-MM-DD
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Parse format: 13-Feb-2025
      const match = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = months[match[2]] || '01';
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    // Convert kit number to BN format
    const formatKitNumber = (kitNum) => {
      if (!kitNum) return null;
      // If it's just a number, add BN- prefix
      if (/^\d+$/.test(kitNum)) {
        return `BN-${kitNum.padStart(4, '0')}`;
      }
      return kitNum;
    };

    return {
      lab_number: getValue(fields[0]),
      name: getValue(fields[1]),
      surname: getValue(fields[2]),
      relation: relationData.relation,
      gender: relationData.gender,
      father_lab_number: relationData.fatherLabNumber,
      collection_date: formatDate(fields[4]),
      submission_date: formatDate(fields[5]),
      mother_present: fields[6] ? (fields[6].toLowerCase() === 'yes' ? 'YES' : 'NO') : null,
      email: getValue(fields[7]),
      address_area: getValue(fields[8]),
      phone_number: getValue(fields[9]),
      case_number: formatKitNumber(fields[10]),
      lab_batch_number: getValue(fields[11]),
      electro_batch: getValue(fields[12]),
      analysis_date: formatDate(fields[13]),
      comments: getValue(fields[14]),
      workflow_status: fields[11] ? 'pcr_batched' : 'sample_collected',
      status: 'pending'
    };
  }

  /**
   * Import samples from tab-delimited text
   */
  async importFromText(textData) {
    const lines = textData.split('\n').filter(line => line.trim());
    this.importStats.total = lines.length;
    
    for (const line of lines) {
      try {
        const sampleData = this.parseLine(line);
        
        // Skip empty lines
        if (!sampleData.lab_number) {
          continue;
        }
        
        // Check if sample already exists
        const existing = db.db.prepare(
          'SELECT id FROM samples WHERE lab_number = ?'
        ).get(sampleData.lab_number);
        
        if (existing) {
          logger.info(`Sample ${sampleData.lab_number} already exists, updating...`);
          
          // Update existing sample
          const updateStmt = db.db.prepare(`
            UPDATE samples SET
              name = COALESCE(?, name),
              surname = COALESCE(?, surname),
              relation = COALESCE(?, relation),
              gender = COALESCE(?, gender),
              collection_date = COALESCE(?, collection_date),
              submission_date = COALESCE(?, submission_date),
              email = COALESCE(?, email),
              phone_number = COALESCE(?, phone_number),
              address_area = COALESCE(?, address_area),
              case_number = COALESCE(?, case_number),
              lab_batch_number = COALESCE(?, lab_batch_number),
              workflow_status = COALESCE(?, workflow_status),
              comments = COALESCE(?, comments),
              updated_at = CURRENT_TIMESTAMP
            WHERE lab_number = ?
          `);
          
          updateStmt.run(
            sampleData.name,
            sampleData.surname,
            sampleData.relation,
            sampleData.gender,
            sampleData.collection_date,
            sampleData.submission_date,
            sampleData.email,
            sampleData.phone_number,
            sampleData.address_area,
            sampleData.case_number,
            sampleData.lab_batch_number,
            sampleData.workflow_status,
            sampleData.comments,
            sampleData.lab_number
          );
          
        } else {
          // Insert new sample
          const insertStmt = db.db.prepare(`
            INSERT INTO samples (
              lab_number, name, surname, relation, gender,
              collection_date, submission_date, email, phone_number,
              address_area, case_number, lab_batch_number,
              workflow_status, status, comments, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);
          
          insertStmt.run(
            sampleData.lab_number,
            sampleData.name,
            sampleData.surname,
            sampleData.relation,
            sampleData.gender,
            sampleData.collection_date,
            sampleData.submission_date,
            sampleData.email,
            sampleData.phone_number,
            sampleData.address_area,
            sampleData.case_number,
            sampleData.lab_batch_number,
            sampleData.workflow_status,
            sampleData.status,
            sampleData.comments
          );
        }
        
        this.importStats.successful++;
        logger.info(`Successfully imported sample: ${sampleData.lab_number}`);
        
      } catch (error) {
        this.importStats.failed++;
        this.importStats.errors.push({
          line: line.substring(0, 50) + '...',
          error: error.message
        });
        logger.error(`Failed to import line: ${error.message}`);
      }
    }
    
    return this.importStats;
  }

  /**
   * Import from CSV file
   */
  async importFromFile(filePath) {
    const fs = require('fs');
    const textData = fs.readFileSync(filePath, 'utf-8');
    return this.importFromText(textData);
  }
}

module.exports = SampleImporter;