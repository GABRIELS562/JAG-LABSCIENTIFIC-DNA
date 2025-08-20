const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'labdna-lims-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// Token blacklist for logout functionality
const tokenBlacklist = new Set();

// Clean up blacklist periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp * 1000 < now) {
        tokenBlacklist.delete(token);
      }
    } catch (error) {
      // Invalid token, remove it
      tokenBlacklist.delete(token);
    }
  }
}, 60 * 60 * 1000); // 1 hour

/**
 * Extract token from request headers
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return authHeader;
};

/**
 * Enhanced authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return ResponseHandler.unauthorized(res, 'Access token required');
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      logger.warn('Attempt to use blacklisted token', {
        ip: req.ip,
        path: req.path
      });
      
      return ResponseHandler.unauthorized(res, 'Token has been revoked');
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('Token verification failed', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return ResponseHandler.unauthorized(res, 'Invalid or expired token');
      }

      // Attach enhanced user information to request
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokenId: user.jti || null,
        tokenIssued: user.iat,
        tokenExpires: user.exp
      };
      
      // Log successful authentication
      logger.debug('User authenticated successfully', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        ip: req.ip
      });
      
      next();
    });
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    return ResponseHandler.internalError(res, 'Authentication service error');
  }
};

/**
 * Enhanced role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Authorization attempt without authentication', {
        ip: req.ip,
        path: req.path
      });
      
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      logger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.role,
        allowedRoles,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return ResponseHandler.forbidden(res, 'Insufficient permissions for this resource');
    }

    // Log successful authorization
    logger.debug('User authorized successfully', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      requiredRoles: allowedRoles,
      path: req.path
    });

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
   * Generate JWT token for user with enhanced security
   */
  generateToken(user, options = {}) {
    const {
      expiresIn = JWT_EXPIRY,
      includePermissions = false
    } = options;
    
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      jti: require('crypto').randomUUID(), // JWT ID for token tracking
      iat: Math.floor(Date.now() / 1000)
    };
    
    if (includePermissions && user.permissions) {
      payload.permissions = user.permissions;
    }

    const token = jwt.sign(payload, JWT_SECRET, { 
      expiresIn,
      issuer: 'labdna-lims',
      audience: 'labdna-users',
      notBefore: 0 // Token is valid immediately
    });
    
    logger.info('Token generated', {
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenId: payload.jti,
      expiresIn
    });
    
    return token;
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

/**
 * Logout middleware - blacklist token
 */
const logout = (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      tokenBlacklist.add(token);
      
      logger.info('User logged out', {
        userId: req.user?.id,
        username: req.user?.username,
        tokenId: req.user?.tokenId,
        ip: req.ip
      });
    }
    
    next();
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    next();
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token && !tokenBlacklist.has(token)) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            tokenId: user.jti || null
          };
        }
      });
    }
  } catch (error) {
    // Log but don't fail the request
    logger.debug('Optional authentication failed', {
      error: error.message,
      ip: req.ip
    });
  }
  
  next();
};

/**
 * Session activity tracking middleware
 */
const trackActivity = (req, res, next) => {
  if (req.user) {
    // Update last activity timestamp
    req.user.lastActivity = new Date();
    
    // Log user activity for audit purposes
    logger.debug('User activity tracked', {
      userId: req.user.id,
      username: req.user.username,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireStaff,
  tokenUtils,
  passwordUtils,
  validationUtils,
  authResponse,
  generateToken, // Legacy compatibility
  logout,
  optionalAuth,
  trackActivity,
  extractToken,
  tokenBlacklist,
  JWT_SECRET,
  JWT_EXPIRY
};