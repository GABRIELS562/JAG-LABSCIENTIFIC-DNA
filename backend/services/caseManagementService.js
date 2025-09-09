const { logger } = require('../utils/logger');
const crypto = require('crypto');
const db = require('./database');

class CaseManagementService {
  constructor() {
    this.db = db;
    this.initializeDatabase();
    this.caseStatuses = ['submitted', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'];
    this.priorities = ['routine', 'urgent', 'stat', 'court_date'];
  }

  async initializeDatabase() {
    // Ensure database is ready
    await this.db.ensureReady();
    
    // Create case management tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        requester_name TEXT,
        requester_organization TEXT,
        requester_contact TEXT,
        court_case_number TEXT,
        court_date DATE,
        priority TEXT DEFAULT 'routine',
        special_instructions TEXT,
        chain_of_custody_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        event_type TEXT NOT NULL,
        event_description TEXT,
        event_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        performed_by TEXT,
        notes TEXT,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_communications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        communication_type TEXT,
        recipient TEXT,
        subject TEXT,
        content TEXT,
        sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_by TEXT,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        file_name TEXT,
        file_type TEXT,
        file_size INTEGER,
        file_path TEXT,
        uploaded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by TEXT,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        note_type TEXT,
        note_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        is_confidential BOOLEAN DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        assigned_to TEXT,
        role TEXT,
        assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_by TEXT,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        review_type TEXT,
        reviewer TEXT,
        review_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        review_status TEXT,
        findings TEXT,
        recommendations TEXT,
        approved BOOLEAN,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS case_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        alert_type TEXT,
        alert_message TEXT,
        severity TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved BOOLEAN DEFAULT 0,
        resolved_by TEXT,
        resolved_at DATETIME,
        FOREIGN KEY (case_id) REFERENCES test_cases(id)
      );
    `);
  }

  // Create new case
  async createCase(caseData) {
    try {
      const caseNumber = await this.generateCaseNumber();
      const chainOfCustodyId = this.generateChainOfCustodyId();

      // Begin transaction
      await this.db.run('BEGIN');

      try {
        // Insert into test_cases table
        const result = await this.db.run(`
          INSERT INTO test_cases (
            case_number, ref_kit_number, test_purpose, 
            sample_type, submission_date, status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
          caseNumber,
          caseData.refKitNumber || `KIT-${Date.now()}`,
          caseData.testPurpose || 'Paternity Testing',
          caseData.sampleType || 'Buccal Swab',
          new Date().toISOString(),
          'submitted'
        );

        const caseId = result.lastInsertRowid;

        // Insert case details
        await this.db.run(`
          INSERT INTO case_details (
            case_id, requester_name, requester_organization, 
            requester_contact, court_case_number, court_date, 
            priority, special_instructions, chain_of_custody_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          caseId,
          caseData.requesterName,
          caseData.requesterOrganization,
          caseData.requesterContact,
          caseData.courtCaseNumber,
          caseData.courtDate,
          caseData.priority || 'routine',
          caseData.specialInstructions,
          chainOfCustodyId
        );

        // Add initial timeline event
        await this.addTimelineEvent(caseId, 'case_created', 'Case created and submitted', 'System');

        // Create samples for participants
        if (caseData.participants) {
          for (const participant of caseData.participants) {
            await this.createSample(caseId, participant);
          }
        }

        // Set up assignments
        if (caseData.assignedTo) {
          await this.assignCase(caseId, caseData.assignedTo, 'primary_analyst');
        }

        // Add any initial notes
        if (caseData.notes) {
          await this.addCaseNote(caseId, 'initial', caseData.notes, 'System');
        }

        // Check for urgent priority
        if (caseData.priority === 'urgent' || caseData.priority === 'stat') {
          await this.createAlert(caseId, 'priority', `High priority case: ${caseData.priority}`, 'high');
        }

        // Check for approaching court date
        if (caseData.courtDate) {
          const daysUntilCourt = this.calculateDaysUntil(caseData.courtDate);
          if (daysUntilCourt <= 7) {
            await this.createAlert(caseId, 'court_date', `Court date in ${daysUntilCourt} days`, 'high');
          }
        }

        await this.db.run('COMMIT');

        return {
          success: true,
          caseId,
          caseNumber,
          chainOfCustodyId,
          message: 'Case created successfully'
        };

      } catch (error) {
        await this.db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      logger.error('Failed to create case', { error: error.message });
      throw error;
    }
  }

  // Create sample for case
  async createSample(caseId, participant) {
    const labNumber = this.generateLabNumber();
    
    await this.db.run(`
      INSERT INTO samples (
        case_id, lab_number, name, surname, 
        relation, id_number, collection_date, 
        status, workflow_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      caseId,
      labNumber,
      participant.name,
      participant.surname,
      participant.relation,
      participant.idNumber,
      new Date().toISOString(),
      'active',
      'sample_collected'
    );

    return labNumber;
  }

  // Update case status
  async updateCaseStatus(caseId, newStatus, notes = '') {
    try {
      // Validate status
      if (!this.caseStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      // Get current status
      const currentCase = await this.db.get('SELECT status FROM test_cases WHERE id = ?', caseId);
      if (!currentCase) {
        throw new Error('Case not found');
      }

      // Update status
      await this.db.run('UPDATE test_cases SET status = ? WHERE id = ?', newStatus, caseId);

      // Add timeline event
      await this.addTimelineEvent(
        caseId, 
        'status_change', 
        `Status changed from ${currentCase.status} to ${newStatus}. ${notes}`,
        'System'
      );

      // Create alerts for specific status changes
      if (newStatus === 'on_hold') {
        await this.createAlert(caseId, 'status', 'Case placed on hold', 'medium');
      } else if (newStatus === 'completed') {
        await this.createAlert(caseId, 'status', 'Case completed - ready for reporting', 'low');
      }

      return { success: true, previousStatus: currentCase.status, newStatus };

    } catch (error) {
      logger.error('Failed to update case status', { error: error.message, caseId });
      throw error;
    }
  }

  // Add timeline event
  async addTimelineEvent(caseId, eventType, description, performedBy) {
    await this.db.run(`
      INSERT INTO case_timeline (case_id, event_type, event_description, performed_by)
      VALUES (?, ?, ?, ?)
    `, caseId, eventType, description, performedBy);
  }

  // Add case note
  async addCaseNote(caseId, noteType, content, createdBy, isConfidential = false) {
    await this.db.run(`
      INSERT INTO case_notes (case_id, note_type, note_content, created_by, is_confidential)
      VALUES (?, ?, ?, ?, ?)
    `, caseId, noteType, content, createdBy, isConfidential);
  }

  // Assign case to analyst
  async assignCase(caseId, assignedTo, role = 'analyst', assignedBy = 'System') {
    await this.db.run(`
      INSERT INTO case_assignments (case_id, assigned_to, role, assigned_by)
      VALUES (?, ?, ?, ?)
    `, caseId, assignedTo, role, assignedBy);

    await this.addTimelineEvent(caseId, 'assignment', `Case assigned to ${assignedTo} as ${role}`, assignedBy);
  }

  // Create alert
  async createAlert(caseId, alertType, message, severity = 'medium') {
    await this.db.run(`
      INSERT INTO case_alerts (case_id, alert_type, alert_message, severity)
      VALUES (?, ?, ?, ?)
    `, caseId, alertType, message, severity);
  }

  // Resolve alert
  async resolveAlert(alertId, resolvedBy) {
    await this.db.run(`
      UPDATE case_alerts 
      SET resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, resolvedBy, alertId);
  }

  // Add case review
  async addCaseReview(caseId, reviewData) {
    const result = await this.db.run(`
      INSERT INTO case_reviews (
        case_id, review_type, reviewer, review_status, 
        findings, recommendations, approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      caseId,
      reviewData.type,
      reviewData.reviewer,
      reviewData.status,
      reviewData.findings,
      reviewData.recommendations,
      reviewData.approved
    );

    // Add timeline event
    await this.addTimelineEvent(
      caseId,
      'review',
      `${reviewData.type} review completed by ${reviewData.reviewer}`,
      reviewData.reviewer
    );

    // Update case status if review is final
    if (reviewData.approved && reviewData.type === 'final') {
      await this.updateCaseStatus(caseId, 'completed', 'Final review approved');
    }

    return result.lastInsertRowid;
  }

  // Get case details
  async getCaseDetails(caseId) {
    try {
      // Get basic case info
      const caseInfo = await this.db.get(`
        SELECT tc.*, cd.*
        FROM test_cases tc
        LEFT JOIN case_details cd ON tc.id = cd.case_id
        WHERE tc.id = ?
      `, caseId);

      if (!caseInfo) {
        return null;
      }

      // Get samples
      const samples = await this.db.all(`
        SELECT * FROM samples WHERE case_id = ?
      `, caseId);

      // Get timeline
      const timeline = await this.db.all(`
        SELECT * FROM case_timeline 
        WHERE case_id = ?
        ORDER BY event_date DESC
      `, caseId);

      // Get assignments
      const assignments = await this.db.all(`
        SELECT * FROM case_assignments
        WHERE case_id = ? AND status = 'active'
      `, caseId);

      // Get notes
      const notes = await this.db.all(`
        SELECT * FROM case_notes
        WHERE case_id = ?
        ORDER BY created_at DESC
      `, caseId);

      // Get active alerts
      const alerts = await this.db.all(`
        SELECT * FROM case_alerts
        WHERE case_id = ? AND resolved = 0
      `, caseId);

      // Get reviews
      const reviews = await this.db.all(`
        SELECT * FROM case_reviews
        WHERE case_id = ?
        ORDER BY review_date DESC
      `, caseId);

      return {
        ...caseInfo,
        samples,
        timeline,
        assignments,
        notes,
        alerts,
        reviews
      };

    } catch (error) {
      logger.error('Failed to get case details', { error: error.message, caseId });
      throw error;
    }
  }

  // Search cases
  async searchCases(criteria) {
    let query = `
      SELECT tc.*, cd.*, 
        (SELECT COUNT(*) FROM samples WHERE case_id = tc.id) as sample_count,
        (SELECT COUNT(*) FROM case_alerts WHERE case_id = tc.id AND resolved = 0) as active_alerts
      FROM test_cases tc
      LEFT JOIN case_details cd ON tc.id = cd.case_id
      WHERE 1=1
    `;

    const params = [];

    if (criteria.caseNumber) {
      query += ' AND tc.case_number LIKE ?';
      params.push(`%${criteria.caseNumber}%`);
    }

    if (criteria.status) {
      query += ' AND tc.status = ?';
      params.push(criteria.status);
    }

    if (criteria.priority) {
      query += ' AND cd.priority = ?';
      params.push(criteria.priority);
    }

    if (criteria.requester) {
      query += ' AND cd.requester_name LIKE ?';
      params.push(`%${criteria.requester}%`);
    }

    if (criteria.dateFrom) {
      query += ' AND tc.submission_date >= ?';
      params.push(criteria.dateFrom);
    }

    if (criteria.dateTo) {
      query += ' AND tc.submission_date <= ?';
      params.push(criteria.dateTo);
    }

    if (criteria.courtDateBefore) {
      query += ' AND cd.court_date <= ?';
      params.push(criteria.courtDateBefore);
    }

    query += ' ORDER BY tc.submission_date DESC';

    if (criteria.limit) {
      query += ' LIMIT ?';
      params.push(criteria.limit);
    }

    return await this.db.all(query, ...params);
  }

  // Get case workload summary
  async getCaseWorkload() {
    const summary = {
      total: 0,
      byStatus: {},
      byPriority: {},
      upcomingCourtDates: [],
      overdue: [],
      alerts: []
    };

    // Count by status
    const statusCounts = await this.db.all(`
      SELECT status, COUNT(*) as count
      FROM test_cases
      GROUP BY status
    `);

    statusCounts.forEach(row => {
      summary.byStatus[row.status] = row.count;
      summary.total += row.count;
    });

    // Count by priority
    const priorityCounts = await this.db.all(`
      SELECT priority, COUNT(*) as count
      FROM case_details
      GROUP BY priority
    `);

    priorityCounts.forEach(row => {
      summary.byPriority[row.priority] = row.count;
    });

    // Get upcoming court dates (next 30 days)
    summary.upcomingCourtDates = await this.db.all(`
      SELECT tc.id, tc.case_number, cd.court_date, cd.court_case_number
      FROM test_cases tc
      JOIN case_details cd ON tc.id = cd.case_id
      WHERE cd.court_date BETWEEN DATE('now') AND DATE('now', '+30 days')
      AND tc.status != 'completed'
      ORDER BY cd.court_date
    `);

    // Get overdue cases (older than 14 days and not completed)
    summary.overdue = await this.db.all(`
      SELECT tc.id, tc.case_number, tc.submission_date, tc.status
      FROM test_cases tc
      WHERE tc.status NOT IN ('completed', 'cancelled')
      AND julianday('now') - julianday(tc.submission_date) > 14
      ORDER BY tc.submission_date
    `);

    // Get active alerts
    summary.alerts = await this.db.all(`
      SELECT ca.*, tc.case_number
      FROM case_alerts ca
      JOIN test_cases tc ON ca.case_id = tc.id
      WHERE ca.resolved = 0
      ORDER BY 
        CASE ca.severity 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        ca.created_at DESC
    `);

    return summary;
  }

  // Get analyst workload
  async getAnalystWorkload(analyst = null) {
    let query = `
      SELECT 
        ca.assigned_to,
        COUNT(DISTINCT ca.case_id) as total_cases,
        SUM(CASE WHEN tc.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN tc.status = 'review' THEN 1 ELSE 0 END) as in_review,
        SUM(CASE WHEN cd.priority IN ('urgent', 'stat') THEN 1 ELSE 0 END) as high_priority
      FROM case_assignments ca
      JOIN test_cases tc ON ca.case_id = tc.id
      LEFT JOIN case_details cd ON tc.id = cd.case_id
      WHERE ca.status = 'active'
    `;

    const params = [];

    if (analyst) {
      query += ' AND ca.assigned_to = ?';
      params.push(analyst);
    }

    query += ' GROUP BY ca.assigned_to';

    return await this.db.all(query, ...params);
  }

  // Generate case number
  async generateCaseNumber() {
    const year = new Date().getFullYear();
    const result = await this.db.get(`
      SELECT COUNT(*) as count 
      FROM test_cases 
      WHERE case_number LIKE ?
    `, `${year}-%`);
    
    const count = result ? result.count : 0;
    return `${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // Generate lab number
  generateLabNumber() {
    const prefix = 'JAG';
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}${timestamp}`;
  }

  // Generate chain of custody ID
  generateChainOfCustodyId() {
    return `COC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }

  // Calculate days until date
  calculateDaysUntil(date) {
    const target = new Date(date);
    const today = new Date();
    const diff = target - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Export case data
  async exportCaseData(caseId, format = 'json') {
    const caseData = await this.getCaseDetails(caseId);
    
    if (!caseData) {
      throw new Error('Case not found');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(caseData, null, 2);
      
      case 'csv':
        // Simplified CSV export
        const headers = ['Case Number', 'Status', 'Priority', 'Submission Date', 'Sample Count'];
        const values = [
          caseData.case_number,
          caseData.status,
          caseData.priority,
          caseData.submission_date,
          caseData.samples.length
        ];
        return headers.join(',') + '\n' + values.join(',');
      
      default:
        return caseData;
    }
  }
}

module.exports = CaseManagementService;