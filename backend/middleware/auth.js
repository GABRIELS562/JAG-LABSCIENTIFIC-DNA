const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'labdna-lims-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { 
        message: 'Access token required',
        code: 'NO_TOKEN'
      }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ 
        success: false, 
        error: { 
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        }
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: { 
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        }
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        error: { 
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: userRoles
        }
      });
    }

    next();
  };
};

// Legacy middleware for backward compatibility
const requireStaff = requireRole(['staff']);

/**
 * JWT token utilities
 */
const tokenUtils = {
  /**
   * Generate JWT token for user
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY,
      issuer: 'labdna-lims',
      audience: 'labdna-users'
    });
  },

  /**
   * Verify and decode JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
};

/**
 * Password utilities using bcrypt
 */
const passwordUtils = {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  },

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password verification failed');
    }
  }
};

/**
 * User validation utilities
 */
const validationUtils = {
  /**
   * Validate user registration data
   */
  validateRegistration(userData) {
    const errors = [];

    if (!userData.username || userData.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Valid email address is required');
    }

    if (!userData.password || userData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!userData.role || !['staff', 'client'].includes(userData.role)) {
      errors.push('Role must be either "staff" or "client"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate login data
   */
  validateLogin(loginData) {
    const errors = [];

    if (!loginData.username && !loginData.email) {
      errors.push('Username or email is required');
    }

    if (!loginData.password) {
      errors.push('Password is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Check if email format is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

/**
 * Auth response helpers
 */
const authResponse = {
  success(res, data, token = null) {
    const response = { success: true, data };
    if (token) {
      response.token = token;
    }
    return res.json(response);
  },

  error(res, message, statusCode = 400, errorCode = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: errorCode
      }
    });
  },

  loginSuccess(res, user, token) {
    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  }
};

// Legacy generateToken function for backward compatibility
const generateToken = tokenUtils.generateToken;

module.exports = {
  authenticateToken,
  requireRole,
  requireStaff,
  tokenUtils,
  passwordUtils,
  validationUtils,
  authResponse,
  generateToken, // Legacy compatibility
  JWT_SECRET,
  JWT_EXPIRY
};