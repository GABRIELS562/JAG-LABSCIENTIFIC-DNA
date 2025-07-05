const GeneticAuthMiddleware = require("../middleware/geneticAuthMiddleware");
const crypto = require("crypto");

class GeneticUserService {
  constructor(database) {
    this.db = database;
    this.auth = new GeneticAuthMiddleware();
    this.setupUserTables();
  }

  /**
   * Initialize user management tables
   */
  setupUserTables() {
    try {
      // Create users table for genetic analysis
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS genetic_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'viewer',
          department TEXT DEFAULT 'genetic_analysis',
          certification_number TEXT,
          certification_expiry DATE,
          is_active BOOLEAN DEFAULT true,
          last_login DATETIME,
          failed_login_attempts INTEGER DEFAULT 0,
          account_locked_until DATETIME,
          password_reset_token TEXT,
          password_reset_expires DATETIME,
          two_factor_secret TEXT,
          two_factor_enabled BOOLEAN DEFAULT false,
          created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          FOREIGN KEY (created_by) REFERENCES genetic_users(id)
        )
      `);

      // Create user sessions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS genetic_user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_token TEXT UNIQUE NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_date DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT true,
          FOREIGN KEY (user_id) REFERENCES genetic_users(id)
        )
      `);

      // Create user permissions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS genetic_user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          permission TEXT NOT NULL,
          granted_by INTEGER NOT NULL,
          granted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_date DATETIME,
          is_active BOOLEAN DEFAULT true,
          FOREIGN KEY (user_id) REFERENCES genetic_users(id),
          FOREIGN KEY (granted_by) REFERENCES genetic_users(id),
          UNIQUE(user_id, permission)
        )
      `);

      // Create audit log table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS genetic_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          session_id TEXT,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          details TEXT,
          severity TEXT DEFAULT 'INFO',
          FOREIGN KEY (user_id) REFERENCES genetic_users(id)
        )
      `);

      // Create default admin user if none exists
      this.createDefaultAdminUser();

      console.log("Genetic user management tables initialized");
    } catch (error) {
      console.error("Failed to setup user tables:", error);
    }
  }

  /**
   * Create default admin user
   */
  createDefaultAdminUser() {
    const adminExists = this.db
      .prepare(
        `
      SELECT id FROM genetic_users WHERE role = 'super_admin'
    `,
      )
      .get();

    if (!adminExists) {
      const defaultPassword = this.auth.hashPassword("LabDNA@Admin2024!");

      this.db
        .prepare(
          `
        INSERT INTO genetic_users (
          username, email, password_hash, first_name, last_name, role,
          department, certification_number, certification_expiry, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          "admin",
          "admin@labdna.co.za",
          defaultPassword.combined,
          "System",
          "Administrator",
          "super_admin",
          "genetic_analysis",
          "SA-DNA-ADMIN-001",
          null,
          1,
        );

      console.log("Default admin user created: admin / LabDNA@Admin2024!");
    }
  }

  /**
   * Create new user
   */
  async createUser(userData, createdBy) {
    try {
      // Validate input
      const validation = this.validateUserData(userData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Check if username or email already exists
      const existing = this.db
        .prepare(
          `
        SELECT id FROM genetic_users 
        WHERE username = ? OR email = ?
      `,
        )
        .get(userData.username, userData.email);

      if (existing) {
        throw new Error("Username or email already exists");
      }

      // Hash password
      const passwordHash = this.auth.hashPassword(userData.password);

      // Insert user
      const result = this.db
        .prepare(
          `
        INSERT INTO genetic_users (
          username, email, password_hash, first_name, last_name, role,
          department, certification_number, certification_expiry, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          userData.username,
          userData.email,
          passwordHash.combined,
          userData.firstName,
          userData.lastName,
          userData.role || "viewer",
          userData.department || "genetic_analysis",
          userData.certificationNumber || null,
          userData.certificationExpiry || null,
          createdBy,
        );

      // Grant default permissions based on role
      this.grantRolePermissions(
        result.lastInsertRowid,
        userData.role || "viewer",
        createdBy,
      );

      // Log user creation
      this.logAudit(createdBy, "USER_CREATED", "user", result.lastInsertRowid, {
        username: userData.username,
        role: userData.role,
      });

      return {
        success: true,
        userId: result.lastInsertRowid,
        username: userData.username,
      };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Authenticate user login
   */
  async authenticateUser(username, password, ipAddress, userAgent) {
    try {
      // Get user data
      const user = this.db
        .prepare(
          `
        SELECT * FROM genetic_users 
        WHERE username = ? OR email = ?
      `,
        )
        .get(username, username);

      if (!user) {
        this.logAudit(
          null,
          "LOGIN_FAILED",
          "user",
          null,
          {
            username: username,
            reason: "User not found",
            ipAddress: ipAddress,
          },
          "WARNING",
        );
        throw new Error("Invalid username or password");
      }

      // Check if account is locked
      if (
        user.account_locked_until &&
        new Date(user.account_locked_until) > new Date()
      ) {
        this.logAudit(
          user.id,
          "LOGIN_BLOCKED",
          "user",
          user.id,
          {
            reason: "Account locked",
            lockedUntil: user.account_locked_until,
            ipAddress: ipAddress,
          },
          "WARNING",
        );
        throw new Error("Account is temporarily locked");
      }

      // Check if account is active
      if (!user.is_active) {
        this.logAudit(
          user.id,
          "LOGIN_FAILED",
          "user",
          user.id,
          {
            reason: "Account inactive",
            ipAddress: ipAddress,
          },
          "WARNING",
        );
        throw new Error("Account is inactive");
      }

      // Verify password
      const passwordValid = this.auth.verifyPassword(
        password,
        user.password_hash,
      );

      if (!passwordValid) {
        // Increment failed attempts
        const failedAttempts = user.failed_login_attempts + 1;
        let lockUntil = null;

        if (failedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        this.db
          .prepare(
            `
          UPDATE genetic_users 
          SET failed_login_attempts = ?, account_locked_until = ?
          WHERE id = ?
        `,
          )
          .run(failedAttempts, lockUntil, user.id);

        this.logAudit(
          user.id,
          "LOGIN_FAILED",
          "user",
          user.id,
          {
            failedAttempts: failedAttempts,
            ipAddress: ipAddress,
          },
          "WARNING",
        );

        throw new Error("Invalid username or password");
      }

      // Check certification expiry
      if (
        user.certification_expiry &&
        new Date(user.certification_expiry) < new Date()
      ) {
        this.logAudit(
          user.id,
          "LOGIN_WARNING",
          "user",
          user.id,
          {
            reason: "Certification expired",
            expiryDate: user.certification_expiry,
          },
          "WARNING",
        );
      }

      // Reset failed attempts and update last login
      this.db
        .prepare(
          `
        UPDATE genetic_users 
        SET failed_login_attempts = 0, account_locked_until = NULL, last_login = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        )
        .run(user.id);

      // Create session
      const sessionToken = this.createSession(user.id, ipAddress, userAgent);

      // Generate JWT token
      const jwtToken = this.auth.generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department,
      });

      // Log successful login
      this.logAudit(user.id, "LOGIN_SUCCESS", "user", user.id, {
        ipAddress: ipAddress,
        sessionId: sessionToken,
      });

      return {
        success: true,
        token: jwtToken,
        sessionId: sessionToken,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          department: user.department,
          certificationNumber: user.certification_number,
          certificationExpiry: user.certification_expiry,
        },
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Create user session
   */
  createSession(userId, ipAddress, userAgent) {
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresDate = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    this.db
      .prepare(
        `
      INSERT INTO genetic_user_sessions (
        user_id, session_token, ip_address, user_agent, expires_date
      ) VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(userId, sessionToken, ipAddress, userAgent, expiresDate);

    return sessionToken;
  }

  /**
   * Validate session
   */
  validateSession(sessionToken) {
    const session = this.db
      .prepare(
        `
      SELECT s.*, u.username, u.role, u.is_active
      FROM genetic_user_sessions s
      JOIN genetic_users u ON s.user_id = u.id
      WHERE s.session_token = ? AND s.is_active = true AND s.expires_date > CURRENT_TIMESTAMP
    `,
      )
      .get(sessionToken);

    if (session && session.is_active) {
      // Update last activity
      this.db
        .prepare(
          `
        UPDATE genetic_user_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE session_token = ?
      `,
        )
        .run(sessionToken);

      return {
        valid: true,
        userId: session.user_id,
        username: session.username,
        role: session.role,
      };
    }

    return { valid: false };
  }

  /**
   * Grant role-based permissions
   */
  grantRolePermissions(userId, role, grantedBy) {
    const permissions = this.auth.getUserPermissions(role);

    for (const permission of permissions) {
      this.db
        .prepare(
          `
        INSERT OR REPLACE INTO genetic_user_permissions (
          user_id, permission, granted_by
        ) VALUES (?, ?, ?)
      `,
        )
        .run(userId, permission, grantedBy);
    }
  }

  /**
   * Validate user data
   */
  validateUserData(userData) {
    const errors = [];

    if (!userData.username || userData.username.length < 3) {
      errors.push("Username must be at least 3 characters");
    }

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push("Valid email address required");
    }

    if (!userData.firstName || userData.firstName.length < 2) {
      errors.push("First name must be at least 2 characters");
    }

    if (!userData.lastName || userData.lastName.length < 2) {
      errors.push("Last name must be at least 2 characters");
    }

    if (userData.password) {
      const passwordValidation = this.auth.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
    }

    const validRoles = [
      "super_admin",
      "lab_director",
      "senior_analyst",
      "analyst",
      "technician",
      "viewer",
    ];
    if (userData.role && !validRoles.includes(userData.role)) {
      errors.push("Invalid role specified");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Log audit events
   */
  logAudit(
    userId,
    action,
    resourceType,
    resourceId,
    details,
    severity = "INFO",
  ) {
    this.db
      .prepare(
        `
      INSERT INTO genetic_audit_log (
        user_id, action, resource_type, resource_id, details, severity
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(details),
        severity,
      );
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    return this.db
      .prepare(
        `
      SELECT id, username, email, first_name, last_name, role, department,
             certification_number, certification_expiry, is_active, 
             last_login, created_date
      FROM genetic_users 
      WHERE id = ?
    `,
      )
      .get(userId);
  }

  /**
   * Get all users (for admins)
   */
  getAllUsers(requestingUserId) {
    const requestingUser = this.getUserById(requestingUserId);

    if (!["super_admin", "lab_director"].includes(requestingUser.role)) {
      throw new Error("Insufficient permissions to list users");
    }

    return this.db
      .prepare(
        `
      SELECT id, username, email, first_name, last_name, role, department,
             certification_number, certification_expiry, is_active, 
             last_login, created_date
      FROM genetic_users 
      ORDER BY last_name, first_name
    `,
      )
      .all();
  }

  /**
   * Update user
   */
  updateUser(userId, updateData, updatedBy) {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updates = [];
    const values = [];

    if (updateData.email) {
      updates.push("email = ?");
      values.push(updateData.email);
    }

    if (updateData.firstName) {
      updates.push("first_name = ?");
      values.push(updateData.firstName);
    }

    if (updateData.lastName) {
      updates.push("last_name = ?");
      values.push(updateData.lastName);
    }

    if (updateData.role) {
      updates.push("role = ?");
      values.push(updateData.role);
      // Update permissions for new role
      this.grantRolePermissions(userId, updateData.role, updatedBy);
    }

    if (updateData.certificationNumber !== undefined) {
      updates.push("certification_number = ?");
      values.push(updateData.certificationNumber);
    }

    if (updateData.certificationExpiry !== undefined) {
      updates.push("certification_expiry = ?");
      values.push(updateData.certificationExpiry);
    }

    if (updateData.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(updateData.isActive);
    }

    if (updates.length > 0) {
      updates.push("updated_date = CURRENT_TIMESTAMP");
      values.push(userId);

      this.db
        .prepare(
          `
        UPDATE genetic_users 
        SET ${updates.join(", ")}
        WHERE id = ?
      `,
        )
        .run(...values);

      this.logAudit(updatedBy, "USER_UPDATED", "user", userId, updateData);
    }

    return this.getUserById(userId);
  }

  /**
   * Change user password
   */
  changePassword(userId, currentPassword, newPassword) {
    const user = this.db
      .prepare(
        `
      SELECT password_hash FROM genetic_users WHERE id = ?
    `,
      )
      .get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    if (!this.auth.verifyPassword(currentPassword, user.password_hash)) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    const validation = this.auth.validatePassword(newPassword);
    if (!validation.valid) {
      throw new Error(
        `Password validation failed: ${validation.errors.join(", ")}`,
      );
    }

    // Hash and update new password
    const newPasswordHash = this.auth.hashPassword(newPassword);

    this.db
      .prepare(
        `
      UPDATE genetic_users 
      SET password_hash = ?, updated_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      )
      .run(newPasswordHash.combined, userId);

    this.logAudit(userId, "PASSWORD_CHANGED", "user", userId, {}, "INFO");

    return { success: true };
  }

  /**
   * Logout user
   */
  logout(sessionToken) {
    this.db
      .prepare(
        `
      UPDATE genetic_user_sessions 
      SET is_active = false 
      WHERE session_token = ?
    `,
      )
      .run(sessionToken);

    return { success: true };
  }
}

module.exports = GeneticUserService;
