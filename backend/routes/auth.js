const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken } = require('../middleware/auth');
const router = express.Router();

// In-memory user store (in production, use a proper database)
const users = [
  {
    id: 1,
    email: 'admin@labdna.co.za',
    password: '$2a$10$JWRu9A0AX6J6plBp0nBIh.vCQ2IlvJNpfHX0STIcASDaDLcCATuDa', // 'admin123'
    name: 'Lab Administrator',
    role: 'staff'
  },
  {
    id: 2,
    email: 'staff@labdna.co.za',
    password: '$2a$10$JWRu9A0AX6J6plBp0nBIh.vCQ2IlvJNpfHX0STIcASDaDLcCATuDa', // 'admin123'
    name: 'Lab Staff',
    role: 'staff'
  },
  {
    id: 3,
    email: 'client@example.com',
    password: '$2a$10$JWRu9A0AX6J6plBp0nBIh.vCQ2IlvJNpfHX0STIcASDaDLcCATuDa', // 'admin123'
    name: 'Test Client',
    role: 'client'
  }
];

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Token refresh endpoint
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    // Generate new token with same payload
    const newToken = generateToken({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    });

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create initial admin user (for development)
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'staff'
    };

    users.push(newUser);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;