const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class GeneticAuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'labdna-genetic-analysis-secret-key';
    this.roleHierarchy = {
      'super_admin': 5,
      'lab_director': 4,
      'senior_analyst': 3,
      'analyst': 2,
      'technician': 1,
      'viewer': 0
    };
    
    this.permissions = {
      'create_case': ['lab_director', 'senior_analyst', 'analyst'],
      'upload_samples': ['lab_director', 'senior_analyst', 'analyst', 'technician'],
      'start_analysis': ['lab_director', 'senior_analyst', 'analyst'],
      'view_results': ['lab_director', 'senior_analyst', 'analyst', 'viewer'],
      'generate_reports': ['lab_director', 'senior_analyst', 'analyst'],
      'delete_case': ['lab_director'],
      'modify_case': ['lab_director', 'senior_analyst'],
      'view_quality_metrics': ['lab_director', 'senior_analyst', 'analyst'],
      'approve_results': ['lab_director', 'senior_analyst'],
      'export_data': ['lab_director', 'senior_analyst']
    };
    
    this.auditLog = [];
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
      department: user.department || 'genetic_analysis',
      timestamp: Date.now()
    };

    const options = {
      expiresIn: '8h', // 8-hour session for genetic analysis work
      issuer: 'LabDNA-LIMS',
      audience: 'genetic-analysis'
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Verify JWT token and extract user information
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'LabDNA-LIMS',
        audience: 'genetic-analysis'
      });
      
      return {
        valid: true,
        user: decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get all permissions for a role
   */
  getUserPermissions(role) {
    const userPermissions = [];
    
    Object.entries(this.permissions).forEach(([permission, allowedRoles]) => {
      if (allowedRoles.includes(role)) {
        userPermissions.push(permission);
      }
    });
    
    return userPermissions;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userRole, requiredPermission) {
    const allowedRoles = this.permissions[requiredPermission];
    return allowedRoles && allowedRoles.includes(userRole);
  }

  /**
   * Middleware to authenticate requests
   */
  authenticate() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
      }

      const token = authHeader.substring(7);
      const verification = this.verifyToken(token);
      
      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          details: verification.error
        });
      }

      // Add user information to request
      req.user = verification.user;
      
      // Log access
      this.logAccess(req.user, req.method, req.originalUrl, req.ip);
      
      next();
    };
  }

  /**
   * Middleware to check specific permissions
   */
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'NO_USER'
        });
      }

      if (!this.hasPermission(req.user.role, permission)) {
        this.logSecurityEvent(req.user, 'PERMISSION_DENIED', {
          requiredPermission: permission,
          userRole: req.user.role,
          endpoint: req.originalUrl
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permission,
          userRole: req.user.role
        });
      }

      next();
    };
  }

  /**
   * Middleware to require specific role level
   */
  requireRole(minRole) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userLevel = this.roleHierarchy[req.user.role] || 0;
      const requiredLevel = this.roleHierarchy[minRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient role level',
          required: minRole,
          current: req.user.role
        });
      }

      next();
    };
  }

  /**
   * Middleware for case ownership/access control
   */
  requireCaseAccess() {
    return async (req, res, next) => {
      const caseId = req.params.caseId;
      
      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: 'Case ID required'
        });
      }

      try {
        // Check if user has access to this case
        const hasAccess = await this.checkCaseAccess(req.user, caseId);
        
        if (!hasAccess) {
          this.logSecurityEvent(req.user, 'CASE_ACCESS_DENIED', {
            caseId: caseId,
            endpoint: req.originalUrl
          });
          
          return res.status(403).json({
            success: false,
            error: 'Access denied for this case',
            caseId: caseId
          });
        }

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to verify case access'
        });
      }
    };
  }

  /**
   * Check if user has access to specific case
   */
  async checkCaseAccess(user, caseId) {
    // Super admin and lab director have access to all cases
    if (['super_admin', 'lab_director'].includes(user.role)) {
      return true;
    }

    // For other roles, check if they created the case or are assigned to it
    // This would typically query the database
    // For now, return true for demonstration
    return true;
  }

  /**
   * Generate secure audit trail
   */
  logAccess(user, method, endpoint, ip) {
    const logEntry = {
      timestamp: new Date(),
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: `${method} ${endpoint}`,
      ip: ip,
      sessionId: this.generateSessionId(user),
      type: 'ACCESS'
    };

    this.auditLog.push(logEntry);
    
    // In production, this would be written to a secure audit database
    console.log(`[GENETIC_AUDIT] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Log security events
   */
  logSecurityEvent(user, event, details) {
    const logEntry = {
      timestamp: new Date(),
      userId: user.userId,
      username: user.username,
      role: user.role,
      event: event,
      details: details,
      severity: 'HIGH',
      type: 'SECURITY'
    };

    this.auditLog.push(logEntry);
    
    // In production, this would trigger security alerts
    console.log(`[SECURITY_ALERT] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Generate session ID for tracking
   */
  generateSessionId(user) {
    const data = `${user.userId}-${user.timestamp}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Middleware for data integrity verification
   */
  requireDataIntegrity() {
    return (req, res, next) => {
      // Add request ID for tracking
      req.requestId = crypto.randomUUID();
      
      // Log data modification requests
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        this.logDataModification(req.user, req.method, req.originalUrl, req.requestId);
      }
      
      next();
    };
  }

  /**
   * Log data modification events
   */
  logDataModification(user, method, endpoint, requestId) {
    const logEntry = {
      timestamp: new Date(),
      requestId: requestId,
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: `${method} ${endpoint}`,
      type: 'DATA_MODIFICATION'
    };

    this.auditLog.push(logEntry);
    console.log(`[DATA_MODIFICATION] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Get audit log (for authorized users only)
   */
  getAuditLog(user, filters = {}) {
    if (!['super_admin', 'lab_director'].includes(user.role)) {
      throw new Error('Unauthorized to access audit logs');
    }

    let filteredLog = [...this.auditLog];

    if (filters.startDate) {
      filteredLog = filteredLog.filter(entry => 
        entry.timestamp >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredLog = filteredLog.filter(entry => 
        entry.timestamp <= new Date(filters.endDate)
      );
    }

    if (filters.userId) {
      filteredLog = filteredLog.filter(entry => 
        entry.userId === filters.userId
      );
    }

    if (filters.type) {
      filteredLog = filteredLog.filter(entry => 
        entry.type === filters.type
      );
    }

    return filteredLog.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Validate strong password requirements
   */
  validatePassword(password) {
    const requirements = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      noCommonPasswords: true
    };

    const errors = [];

    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    const commonPasswords = [
      'password', '123456789', 'qwerty123', 'admin123', 'labdna123'
    ];

    if (requirements.noCommonPasswords && commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password cannot be a common password');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Hash password securely
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    
    return {
      salt: salt,
      hash: hash,
      combined: `${salt}:${hash}`
    };
  }

  /**
   * Verify password against hash
   */
  verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    
    return hash === verifyHash;
  }
}

module.exports = GeneticAuthMiddleware;