const express = require('express');
const { 
  authenticateToken, 
  tokenUtils, 
  passwordUtils, 
  validationUtils, 
  authResponse 
} = require('../middleware/auth');
const databaseService = require('../services/database');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    const validation = validationUtils.validateLogin({ username, email, password });
    if (!validation.isValid) {
      return authResponse.error(res, validation.errors.join(', '), 400, 'VALIDATION_ERROR');
    }

    // Find user by username or email
    let user = null;
    if (username) {
      user = databaseService.getUserByUsername(username);
    } else if (email) {
      user = databaseService.getUserByEmail(email);
    }

    if (!user) {
      return authResponse.error(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await passwordUtils.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return authResponse.error(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    databaseService.updateUserLastLogin(user.id);

    // Generate token
    const token = tokenUtils.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Return success response
    authResponse.loginSuccess(res, user, token);

  } catch (error) {
    console.error('Login error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = databaseService.getUserById(req.user.id);
    if (!user) {
      return authResponse.error(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    authResponse.success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Token refresh endpoint
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    // Verify user still exists
    const user = databaseService.getUserById(req.user.id);
    if (!user) {
      return authResponse.error(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate new token with current user data
    const newToken = tokenUtils.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    authResponse.success(res, { token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Logout endpoint (for token blacklisting if needed)
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // In a full implementation, you would blacklist the token here
    // For now, we'll just return success as token expiry handles security
    authResponse.success(res, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Register new user endpoint (staff only)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Check if current user is staff
    if (req.user.role !== 'staff') {
      return authResponse.error(res, 'Only staff can register new users', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const { username, email, password, role } = req.body;

    // Validate input
    const validation = validationUtils.validateRegistration({ username, email, password, role });
    if (!validation.isValid) {
      return authResponse.error(res, validation.errors.join(', '), 400, 'VALIDATION_ERROR');
    }

    // Check if username or email already exists
    if (databaseService.checkUsernameExists(username)) {
      return authResponse.error(res, 'Username already exists', 400, 'USERNAME_EXISTS');
    }

    if (databaseService.checkEmailExists(email)) {
      return authResponse.error(res, 'Email already exists', 400, 'EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await passwordUtils.hashPassword(password);

    // Create new user
    const newUser = databaseService.createUser({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      role
    });

    authResponse.success(res, {
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Get all users endpoint (staff only)
router.get('/users', authenticateToken, (req, res) => {
  try {
    // Check if current user is staff
    if (req.user.role !== 'staff') {
      return authResponse.error(res, 'Only staff can view all users', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const users = databaseService.getAllUsers();
    authResponse.success(res, users);
  } catch (error) {
    console.error('Get users error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Update user endpoint (staff only or own profile)
router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { username, email, password, role } = req.body;

    // Check permissions - staff can edit anyone, users can edit their own profile
    if (req.user.role !== 'staff' && req.user.id !== targetUserId) {
      return authResponse.error(res, 'Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Non-staff users can't change roles
    if (req.user.role !== 'staff' && role) {
      return authResponse.error(res, 'Cannot change role', 403, 'CANNOT_CHANGE_ROLE');
    }

    const updateData = {};

    if (username) {
      if (databaseService.checkUsernameExists(username, targetUserId)) {
        return authResponse.error(res, 'Username already exists', 400, 'USERNAME_EXISTS');
      }
      updateData.username = username.toLowerCase();
    }

    if (email) {
      if (!validationUtils.isValidEmail(email)) {
        return authResponse.error(res, 'Invalid email format', 400, 'INVALID_EMAIL');
      }
      if (databaseService.checkEmailExists(email, targetUserId)) {
        return authResponse.error(res, 'Email already exists', 400, 'EMAIL_EXISTS');
      }
      updateData.email = email.toLowerCase();
    }

    if (password) {
      if (password.length < 6) {
        return authResponse.error(res, 'Password must be at least 6 characters', 400, 'PASSWORD_TOO_SHORT');
      }
      updateData.password_hash = await passwordUtils.hashPassword(password);
    }

    if (role && req.user.role === 'staff') {
      if (!['staff', 'client'].includes(role)) {
        return authResponse.error(res, 'Invalid role', 400, 'INVALID_ROLE');
      }
      updateData.role = role;
    }

    const updatedUser = databaseService.updateUser(targetUserId, updateData);
    
    authResponse.success(res, {
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

// Delete user endpoint (staff only)
router.delete('/users/:id', authenticateToken, (req, res) => {
  try {
    // Check if current user is staff
    if (req.user.role !== 'staff') {
      return authResponse.error(res, 'Only staff can delete users', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const targetUserId = parseInt(req.params.id);

    // Don't allow users to delete themselves
    if (req.user.id === targetUserId) {
      return authResponse.error(res, 'Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
    }

    databaseService.deleteUser(targetUserId);
    authResponse.success(res, { message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    authResponse.error(res, 'Internal server error', 500, 'SERVER_ERROR');
  }
});

module.exports = router;