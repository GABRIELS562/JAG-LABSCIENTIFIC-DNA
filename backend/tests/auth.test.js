const request = require('supertest')
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authRoutes = require('../routes/auth')

// Mock the database service
const mockUsers = []
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }),
  exec: jest.fn()
}

jest.mock('../services/database', () => ({
  db: mockDb,
  createUser: jest.fn(),
  getUserByUsername: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  updateUserPassword: jest.fn()
}))

const db = require('../services/database')

describe('Authentication Routes', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/auth', authRoutes)
    jest.clearAllMocks()
    
    // Set up JWT secret for tests
    process.env.JWT_SECRET = 'test-jwt-secret'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = testUtils.createMockUser({
        username: 'testuser',
        password: await bcrypt.hash('password123', 10),
        role: 'staff'
      })

      db.getUserByUsername.mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({
          username: 'testuser',
          role: 'staff'
        })
      })

      // Verify JWT token
      const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET)
      expect(decodedToken.userId).toBe(mockUser.id)
      expect(decodedToken.role).toBe(mockUser.role)

      expect(db.getUserByUsername).toHaveBeenCalledWith('testuser')
    })

    it('should reject invalid username', async () => {
      db.getUserByUsername.mockResolvedValue(null)

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid username or password'
        })
      })
    })

    it('should reject invalid password', async () => {
      const mockUser = testUtils.createMockUser({
        username: 'testuser',
        password: await bcrypt.hash('correctpassword', 10)
      })

      db.getUserByUsername.mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toBe('Invalid username or password')
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser'
          // missing password
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Username and password are required')
    })

    it('should handle database errors', async () => {
      db.getUserByUsername.mockRejectedValue(new Error('Database connection failed'))

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Internal server error')
    })

    it('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: '',
          password: ''
        })
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /auth/register', () => {
    beforeEach(() => {
      // Mock staff user for authentication
      app.use((req, res, next) => {
        req.user = { id: 1, role: 'staff', username: 'staffuser' }
        next()
      })
    })

    it('should register new user successfully', async () => {
      const userData = {
        username: 'newuser',
        password: 'newpassword123',
        role: 'client',
        email: 'newuser@example.com'
      }

      const mockCreatedUser = testUtils.createMockUser({
        id: 2,
        ...userData,
        password: undefined // Don't return password
      })

      db.createUser.mockResolvedValue(mockCreatedUser)

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            username: 'newuser',
            role: 'client',
            email: 'newuser@example.com'
          })
        })
      })

      expect(db.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          password: expect.any(String), // Should be hashed
          role: 'client',
          email: 'newuser@example.com'
        })
      )

      // Verify password was hashed
      const createUserCall = db.createUser.mock.calls[0][0]
      expect(createUserCall.password).not.toBe('newpassword123')
      expect(await bcrypt.compare('newpassword123', createUserCall.password)).toBe(true)
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser'
          // missing required fields
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('required')
    })

    it('should enforce password strength', async () => {
      const userData = {
        username: 'newuser',
        password: '123', // Too weak
        role: 'client',
        email: 'newuser@example.com'
      }

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Password must be at least')
    })

    it('should validate email format', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        role: 'client',
        email: 'invalid-email'
      }

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Invalid email format')
    })

    it('should handle duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        password: 'password123',
        role: 'client',
        email: 'user@example.com'
      }

      db.createUser.mockRejectedValue(new Error('UNIQUE constraint failed: users.username'))

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Username already exists')
    })

    it('should validate role values', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        role: 'invalid-role',
        email: 'user@example.com'
      }

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Invalid role')
    })
  })

  describe('GET /auth/me', () => {
    it('should return current user info with valid token', async () => {
      const mockUser = testUtils.createMockUser({ id: 1, username: 'testuser' })
      const token = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )

      db.getUserById.mockResolvedValue(mockUser)

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: mockUser.id,
          username: 'testuser'
        })
      })

      expect(db.getUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Invalid token')
    })

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Access token required')
    })

    it('should handle expired token', async () => {
      const mockUser = testUtils.createMockUser({ id: 1 })
      const expiredToken = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired
      )

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Token expired')
    })

    it('should handle user not found', async () => {
      const mockUser = testUtils.createMockUser({ id: 999 })
      const token = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET
      )

      db.getUserById.mockResolvedValue(null)

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('User not found')
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const mockUser = testUtils.createMockUser({ id: 1 })
      const token = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET
      )

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully'
      })
    })

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200) // Should still succeed

      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockUser = testUtils.createMockUser({ id: 1 })
      const oldToken = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )

      db.getUserById.mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          token: expect.any(String)
        })
      })

      // Verify new token is different
      expect(response.body.data.token).not.toBe(oldToken)

      // Verify new token is valid
      const decodedToken = jwt.verify(response.body.data.token, process.env.JWT_SECRET)
      expect(decodedToken.userId).toBe(mockUser.id)
    })

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /auth/users/:id', () => {
    beforeEach(() => {
      // Mock authenticated user
      app.use((req, res, next) => {
        req.user = { id: 1, role: 'staff', username: 'staffuser' }
        next()
      })
    })

    it('should update user profile successfully', async () => {
      const updateData = {
        email: 'updated@example.com',
        full_name: 'Updated Name'
      }

      const updatedUser = testUtils.createMockUser({
        id: 1,
        ...updateData
      })

      db.updateUser.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put('/auth/users/1')
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: 'updated@example.com',
            full_name: 'Updated Name'
          })
        })
      })

      expect(db.updateUser).toHaveBeenCalledWith(1, updateData)
    })

    it('should prevent updating sensitive fields', async () => {
      const updateData = {
        role: 'admin', // Should be filtered out
        password: 'newpassword' // Should be filtered out
      }

      const response = await request(app)
        .put('/auth/users/1')
        .send(updateData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Cannot update sensitive fields')
    })

    it('should handle user not found', async () => {
      db.updateUser.mockResolvedValue(null)

      const response = await request(app)
        .put('/auth/users/999')
        .send({ email: 'test@example.com' })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('User not found')
    })
  })

  describe('POST /auth/change-password', () => {
    beforeEach(() => {
      // Mock authenticated user
      app.use((req, res, next) => {
        req.user = { id: 1, role: 'staff', username: 'testuser' }
        next()
      })
    })

    it('should change password successfully', async () => {
      const mockUser = testUtils.createMockUser({
        id: 1,
        password: await bcrypt.hash('currentpassword', 10)
      })

      db.getUserById.mockResolvedValue(mockUser)
      db.updateUserPassword.mockResolvedValue({ success: true })

      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'currentpassword',
          newPassword: 'newpassword123'
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password updated successfully'
      })

      expect(db.updateUserPassword).toHaveBeenCalledWith(
        1,
        expect.any(String) // Should be hashed new password
      )
    })

    it('should reject incorrect current password', async () => {
      const mockUser = testUtils.createMockUser({
        id: 1,
        password: await bcrypt.hash('currentpassword', 10)
      })

      db.getUserById.mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Current password is incorrect')
    })

    it('should validate new password strength', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'currentpassword',
          newPassword: '123' // Too weak
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Password must be at least')
    })
  })

  describe('JWT Token Management', () => {
    it('should generate valid JWT tokens', async () => {
      const userId = 1
      const role = 'staff'

      const token = jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      expect(decoded.userId).toBe(userId)
      expect(decoded.role).toBe(role)
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000)
    })

    it('should handle malformed Authorization headers', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    it('should handle missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'some-token-without-bearer')
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })
})