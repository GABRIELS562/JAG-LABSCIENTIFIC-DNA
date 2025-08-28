const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../utils/logger');
const crypto = require('crypto');

class CaseManagementService {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.db = new Database(this.dbPath, { fileMustExist: false });
    this.initializeDatabase();
    this.caseStatuses = ['submitted', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'];
    this.priorities = ['routine', 'urgent', 'stat', 'court_date'];
  }

  initializeDatabase() {
    // Create case management tables
    this.db.exec(`
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
      const caseNumber = this.generateCaseNumber();
      const chainOfCustodyId = this.generateChainOfCustodyId();

      // Begin transaction
      this.db.prepare('BEGIN').run();

      try {
        // Insert into test_cases table
        const caseStmt = this.db.prepare(`
          INSERT INTO test_cases (
            case_number, ref_kit_number, test_purpose, 
            sample_type, submission_date, status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = caseStmt.run(
          caseNumber,
          caseData.refKitNumber || `KIT-${Date.now()}`,
          caseData.testPurpose || 'Paternity Testing',
          caseData.sampleType || 'Buccal Swab',
          new Date().toISOString(),
          'submitted'
        );

        const caseId = result.lastInsertRowid;

        // Insert case details
        const detailsStmt = this.db.prepare(`
          INSERT INTO case_details (
            case_id, requester_name, requester_organization, 
            requester_contact, court_case_number, court_date, 
            priority, special_instructions, chain_of_custody_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        detailsStmt.run(
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
        this.addTimelineEvent(caseId, 'case_created', 'Case created and submitted', 'System');

        // Create samples for participants
        if (caseData.participants) {
          for (const participant of caseData.participants) {
            this.createSample(caseId, participant);
          }
        }

        // Set up assignments
        if (caseData.assignedTo) {
          this.assignCase(caseId, caseData.assignedTo, 'primary_analyst');
        }

        // Add any initial notes
        if (caseData.notes) {
          this.addCaseNote(caseId, 'initial', caseData.notes, 'System');
        }

        // Check for urgent priority
        if (caseData.priority === 'urgent' || caseData.priority === 'stat') {
          this.createAlert(caseId, 'priority', `High priority case: ${caseData.priority}`, 'high');
        }

        // Check for approaching court date
        if (caseData.courtDate) {
          const daysUntilCourt = this.calculateDaysUntil(caseData.courtDate);
          if (daysUntilCourt <= 7) {
            this.createAlert(caseId, 'court_date', `Court date in ${daysUntilCourt} days`, 'high');
          }
        }

        this.db.prepare('COMMIT').run();

        return {
          success: true,
          caseId,
          caseNumber,
          chainOfCustodyId,
          message: 'Case created successfully'
        };

      } catch (error) {
        this.db.prepare('ROLLBACK').run();
        throw error;
      }

    } catch (error) {
      logger.error('Failed to create case', { error: error.message });
      throw error;
    }
  }

  // Create sample for case
  createSample(caseId, participant) {
    const labNumber = this.generateLabNumber();
    
    const stmt = this.db.prepare(`
      INSERT INTO samples (
        case_id, lab_number, name, surname, 
        relation, id_number, collection_date, 
        status, workflow_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
  updateCaseStatus(caseId, newStatus, notes = '') {
    try {
      // Validate status
      if (!this.caseStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      // Get current status
      const currentCase = this.db.prepare('SELECT status FROM test_cases WHERE id = ?').get(caseId);
      if (!currentCase) {
        throw new Error('Case not found');
      }

      // Update status
      const stmt = this.db.prepare('UPDATE test_cases SET status = ? WHERE id = ?');
      stmt.run(newStatus, caseId);

      // Add timeline event
      this.addTimelineEvent(
        caseId, 
        'status_change', 
        `Status changed from ${currentCase.status} to ${newStatus}. ${notes}`,
        'System'
      );

      // Create alerts for specific status changes
      if (newStatus === 'on_hold') {
        this.createAlert(caseId, 'status', 'Case placed on hold', 'medium');
      } else if (newStatus === 'completed') {
        this.createAlert(caseId, 'status', 'Case completed - ready for reporting', 'low');
      }

      return { success: true, previousStatus: currentCase.status, newStatus };

    } catch (error) {
      logger.error('Failed to update case status', { error: error.message, caseId });
      throw error;
    }
  }

  // Add timeline event
  addTimelineEvent(caseId, eventType, description, performedBy) {
    const stmt = this.db.prepare(`
      INSERT INTO case_timeline (case_id, event_type, event_description, performed_by)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(caseId, eventType, description, performedBy);
  }

  // Add case note
  addCaseNote(caseId, noteType, content, createdBy, isConfidential = false) {
    const stmt = this.db.prepare(`
      INSERT INTO case_notes (case_id, note_type, note_content, created_by, is_confidential)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(caseId, noteType, content, createdBy, isConfidential);
  }

  // Assign case to analyst
  assignCase(caseId, assignedTo, role = 'analyst', assignedBy = 'System') {
    const stmt = this.db.prepare(`
      INSERT INTO case_assignments (case_id, assigned_to, role, assigned_by)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(caseId, assignedTo, role, assignedBy);

    this.addTimelineEvent(caseId, 'assignment', `Case assigned to ${assignedTo} as ${role}`, assignedBy);
  }

  // Create alert
  createAlert(caseId, alertType, message, severity = 'medium') {
    const stmt = this.db.prepare(`
      INSERT INTO case_alerts (case_id, alert_type, alert_message, severity)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(caseId, alertType, message, severity);
  }

  // Resolve alert
  resolveAlert(alertId, resolvedBy) {
    const stmt = this.db.prepare(`
      UPDATE case_alerts 
      SET resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(resolvedBy, alertId);
  }

  // Add case review
  addCaseReview(caseId, reviewData) {
    const stmt = this.db.prepare(`
      INSERT INTO case_reviews (
        case_id, review_type, reviewer, review_status, 
        findings, recommendations, approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      caseId,
      reviewData.type,
      reviewData.reviewer,
      reviewData.status,
      reviewData.findings,
      reviewData.recommendations,
      reviewData.approved
    );

    // Add timeline event
    this.addTimelineEvent(
      caseId,
      'review',
      `${reviewData.type} review completed by ${reviewData.reviewer}`,
      reviewData.reviewer
    );

    // Update case status if review is final
    if (reviewData.approved && reviewData.type === 'final') {
      this.updateCaseStatus(caseId, 'completed', 'Final review approved');
    }

    return result.lastInsertRowid;
  }

  // Get case details
  getCaseDetails(caseId) {
    try {
      // Get basic case info
      const caseInfo = this.db.prepare(`
        SELECT tc.*, cd.*
        FROM test_cases tc
        LEFT JOIN case_details cd ON tc.id = cd.case_id
        WHERE tc.id = ?
      `).get(caseId);

      if (!caseInfo) {
        return null;
      }

      // Get samples
      const samples = this.db.prepare(`
        SELECT * FROM samples WHERE case_id = ?
      `).all(caseId);

      // Get timeline
      const timeline = this.db.prepare(`
        SELECT * FROM case_timeline 
        WHERE case_id = ?
        ORDER BY event_date DESC
      `).all(caseId);

      // Get assignments
      const assignments = this.db.prepare(`
        SELECT * FROM case_assignments
        WHERE case_id = ? AND status = 'active'
      `).all(caseId);

      // Get notes
      const notes = this.db.prepare(`
        SELECT * FROM case_notes
        WHERE case_id = ?
        ORDER BY created_at DESC
      `).all(caseId);

      // Get active alerts
      const alerts = this.db.prepare(`
        SELECT * FROM case_alerts
        WHERE case_id = ? AND resolved = 0
      `).all(caseId);

      // Get reviews
      const reviews = this.db.prepare(`
        SELECT * FROM case_reviews
        WHERE case_id = ?
        ORDER BY review_date DESC
      `).all(caseId);

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
  searchCases(criteria) {
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

    return this.db.prepare(query).all(...params);
  }

  // Get case workload summary
  getCaseWorkload() {
    const summary = {
      total: 0,
      byStatus: {},
      byPriority: {},
      upcomingCourtDates: [],
      overdue: [],
      alerts: []
    };

    // Count by status
    const statusCounts = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM test_cases
      GROUP BY status
    `).all();

    statusCounts.forEach(row => {
      summary.byStatus[row.status] = row.count;
      summary.total += row.count;
    });

    // Count by priority
    const priorityCounts = this.db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM case_details
      GROUP BY priority
    `).all();

    priorityCounts.forEach(row => {
      summary.byPriority[row.priority] = row.count;
    });

    // Get upcoming court dates (next 30 days)
    summary.upcomingCourtDates = this.db.prepare(`
      SELECT tc.id, tc.case_number, cd.court_date, cd.court_case_number
      FROM test_cases tc
      JOIN case_details cd ON tc.id = cd.case_id
      WHERE cd.court_date BETWEEN DATE('now') AND DATE('now', '+30 days')
      AND tc.status != 'completed'
      ORDER BY cd.court_date
    `).all();

    // Get overdue cases (older than 14 days and not completed)
    summary.overdue = this.db.prepare(`
      SELECT tc.id, tc.case_number, tc.submission_date, tc.status
      FROM test_cases tc
      WHERE tc.status NOT IN ('completed', 'cancelled')
      AND julianday('now') - julianday(tc.submission_date) > 14
      ORDER BY tc.submission_date
    `).all();

    // Get active alerts
    summary.alerts = this.db.prepare(`
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
    `).all();

    return summary;
  }

  // Get analyst workload
  getAnalystWorkload(analyst = null) {
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

    return this.db.prepare(query).all(...params);
  }

  // Generate case number
  generateCaseNumber() {
    const year = new Date().getFullYear();
    const count = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM test_cases 
      WHERE case_number LIKE ?
    `).get(`${year}-%`).count;

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
  exportCaseData(caseId, format = 'json') {
    const caseData = this.getCaseDetails(caseId);
    
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