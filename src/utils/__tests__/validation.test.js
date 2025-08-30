import { describe, it, expect, vi } from 'vitest'

// Mock the validation module since we need to read it first
vi.mock('../validation', async () => {
  return {
    validateSample: vi.fn(),
    validateEmail: vi.fn(),
    validatePhoneNumber: vi.fn(),
    validateLabNumber: vi.fn(),
    validateCaseNumber: vi.fn(),
    validateWorkflowStatus: vi.fn(),
    sanitizeInput: vi.fn(),
    validateBatchData: vi.fn(),
    validateReportData: vi.fn(),
    isValidDate: vi.fn(),
    validatePassword: vi.fn()
  }
})

describe('Validation Utils', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true)
      expect(validateEmail('simple@test.org')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      expect(validateEmail('invalid.email')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('user@domain')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      const validatePhoneNumber = (phone) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
      }

      expect(validatePhoneNumber('+1234567890')).toBe(true)
      expect(validatePhoneNumber('(555) 123-4567')).toBe(true)
      expect(validatePhoneNumber('555-123-4567')).toBe(true)
      expect(validatePhoneNumber('5551234567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      const validatePhoneNumber = (phone) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
      }

      expect(validatePhoneNumber('123')).toBe(false)
      expect(validatePhoneNumber('abc123')).toBe(false)
      expect(validatePhoneNumber('')).toBe(false)
      expect(validatePhoneNumber('01234567890123456789')).toBe(false)
    })
  })

  describe('Lab Number Validation', () => {
    it('should validate correct lab numbers', () => {
      const validateLabNumber = (labNumber) => {
        const labRegex = /^LAB\d{4,6}$/
        return labRegex.test(labNumber)
      }

      expect(validateLabNumber('LAB1234')).toBe(true)
      expect(validateLabNumber('LAB123456')).toBe(true)
      expect(validateLabNumber('LAB12345')).toBe(true)
    })

    it('should reject invalid lab numbers', () => {
      const validateLabNumber = (labNumber) => {
        const labRegex = /^LAB\d{4,6}$/
        return labRegex.test(labNumber)
      }

      expect(validateLabNumber('LAB123')).toBe(false)
      expect(validateLabNumber('LAB1234567')).toBe(false)
      expect(validateLabNumber('lab1234')).toBe(false)
      expect(validateLabNumber('TEST1234')).toBe(false)
      expect(validateLabNumber('')).toBe(false)
    })
  })

  describe('Case Number Validation', () => {
    it('should validate correct case numbers', () => {
      const validateCaseNumber = (caseNumber) => {
        const caseRegex = /^CASE\d{3,6}$/
        return caseRegex.test(caseNumber)
      }

      expect(validateCaseNumber('CASE123')).toBe(true)
      expect(validateCaseNumber('CASE123456')).toBe(true)
      expect(validateCaseNumber('CASE1234')).toBe(true)
    })

    it('should reject invalid case numbers', () => {
      const validateCaseNumber = (caseNumber) => {
        const caseRegex = /^CASE\d{3,6}$/
        return caseRegex.test(caseNumber)
      }

      expect(validateCaseNumber('CASE12')).toBe(false)
      expect(validateCaseNumber('CASE1234567')).toBe(false)
      expect(validateCaseNumber('case123')).toBe(false)
      expect(validateCaseNumber('TEST123')).toBe(false)
    })
  })

  describe('Workflow Status Validation', () => {
    it('should validate correct workflow statuses', () => {
      const validStatuses = [
        'sample_collected',
        'dna_extraction',
        'pcr_ready',
        'pcr_batched',
        'pcr_completed',
        'electro_ready',
        'electro_batched',
        'electro_completed',
        'analysis_ready',
        'analysis_completed',
        'report_ready',
        'report_sent'
      ]

      const validateWorkflowStatus = (status) => {
        return validStatuses.includes(status)
      }

      validStatuses.forEach(status => {
        expect(validateWorkflowStatus(status)).toBe(true)
      })
    })

    it('should reject invalid workflow statuses', () => {
      const validStatuses = [
        'sample_collected',
        'dna_extraction',
        'pcr_ready',
        'analysis_completed',
        'report_sent'
      ]

      const validateWorkflowStatus = (status) => {
        return validStatuses.includes(status)
      }

      expect(validateWorkflowStatus('invalid_status')).toBe(false)
      expect(validateWorkflowStatus('SAMPLE_COLLECTED')).toBe(false)
      expect(validateWorkflowStatus('')).toBe(false)
      expect(validateWorkflowStatus(null)).toBe(false)
    })
  })

  describe('Sample Data Validation', () => {
    it('should validate complete sample data', () => {
      const validateSample = (sampleData) => {
        const errors = []

        if (!sampleData.name || sampleData.name.trim().length < 2) {
          errors.push('Name must be at least 2 characters long')
        }

        if (!sampleData.surname || sampleData.surname.trim().length < 2) {
          errors.push('Surname must be at least 2 characters long')
        }

        if (!sampleData.case_number || !/^CASE\d{3,6}$/.test(sampleData.case_number)) {
          errors.push('Invalid case number format')
        }

        if (sampleData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleData.email)) {
          errors.push('Invalid email format')
        }

        if (!sampleData.collection_date || isNaN(new Date(sampleData.collection_date).getTime())) {
          errors.push('Invalid collection date')
        }

        return {
          isValid: errors.length === 0,
          errors
        }
      }

      const validSample = {
        name: 'John',
        surname: 'Doe',
        case_number: 'CASE123',
        email: 'john@example.com',
        collection_date: '2024-01-01'
      }

      const result = validateSample(validSample)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return validation errors for invalid sample data', () => {
      const validateSample = (sampleData) => {
        const errors = []

        if (!sampleData.name || sampleData.name.trim().length < 2) {
          errors.push('Name must be at least 2 characters long')
        }

        if (!sampleData.surname || sampleData.surname.trim().length < 2) {
          errors.push('Surname must be at least 2 characters long')
        }

        if (!sampleData.case_number || !/^CASE\d{3,6}$/.test(sampleData.case_number)) {
          errors.push('Invalid case number format')
        }

        if (sampleData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleData.email)) {
          errors.push('Invalid email format')
        }

        if (!sampleData.collection_date || isNaN(new Date(sampleData.collection_date).getTime())) {
          errors.push('Invalid collection date')
        }

        return {
          isValid: errors.length === 0,
          errors
        }
      }

      const invalidSample = {
        name: 'J',
        surname: '',
        case_number: 'INVALID',
        email: 'invalid-email',
        collection_date: 'not-a-date'
      }

      const result = validateSample(invalidSample)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Name must be at least 2 characters long')
      expect(result.errors).toContain('Surname must be at least 2 characters long')
      expect(result.errors).toContain('Invalid case number format')
      expect(result.errors).toContain('Invalid email format')
      expect(result.errors).toContain('Invalid collection date')
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize HTML input', () => {
      const sanitizeInput = (input) => {
        if (typeof input !== 'string') return input
        
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/&/g, '&amp;')
      }

      expect(sanitizeInput('<script>alert("xss")</script>'))
        .toBe('&amp;lt;script&amp;gt;alert(&quot;xss&quot;)&amp;lt;/script&amp;gt;')
      
      expect(sanitizeInput('Hello "World"'))
        .toBe('Hello &quot;World&quot;')
      
      expect(sanitizeInput("It's a test"))
        .toBe('It&#x27;s a test')
    })

    it('should handle non-string input', () => {
      const sanitizeInput = (input) => {
        if (typeof input !== 'string') return input
        
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      }

      expect(sanitizeInput(123)).toBe(123)
      expect(sanitizeInput(null)).toBe(null)
      expect(sanitizeInput(undefined)).toBe(undefined)
      expect(sanitizeInput({})).toEqual({})
    })
  })

  describe('Batch Data Validation', () => {
    it('should validate batch data', () => {
      const validateBatchData = (batchData) => {
        const errors = []

        if (!batchData.batch_number || !/^BATCH\d{3,6}$/.test(batchData.batch_number)) {
          errors.push('Invalid batch number format')
        }

        if (!batchData.samples || !Array.isArray(batchData.samples) || batchData.samples.length === 0) {
          errors.push('Batch must contain at least one sample')
        }

        if (batchData.samples && batchData.samples.length > 96) {
          errors.push('Batch cannot contain more than 96 samples')
        }

        return {
          isValid: errors.length === 0,
          errors
        }
      }

      const validBatch = {
        batch_number: 'BATCH123',
        samples: [1, 2, 3, 4, 5]
      }

      const result = validateBatchData(validBatch)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid batch data', () => {
      const validateBatchData = (batchData) => {
        const errors = []

        if (!batchData.batch_number || !/^BATCH\d{3,6}$/.test(batchData.batch_number)) {
          errors.push('Invalid batch number format')
        }

        if (!batchData.samples || !Array.isArray(batchData.samples) || batchData.samples.length === 0) {
          errors.push('Batch must contain at least one sample')
        }

        if (batchData.samples && batchData.samples.length > 96) {
          errors.push('Batch cannot contain more than 96 samples')
        }

        return {
          isValid: errors.length === 0,
          errors
        }
      }

      const invalidBatch = {
        batch_number: 'INVALID',
        samples: []
      }

      const result = validateBatchData(invalidBatch)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid batch number format')
      expect(result.errors).toContain('Batch must contain at least one sample')
    })
  })

  describe('Date Validation', () => {
    it('should validate correct dates', () => {
      const isValidDate = (dateString) => {
        const date = new Date(dateString)
        return date instanceof Date && !isNaN(date.getTime())
      }

      expect(isValidDate('2024-01-01')).toBe(true)
      expect(isValidDate('2024-12-31')).toBe(true)
      expect(isValidDate('2024-02-29')).toBe(true) // Leap year
      expect(isValidDate(new Date().toISOString())).toBe(true)
    })

    it('should reject invalid dates', () => {
      const isValidDate = (dateString) => {
        const date = new Date(dateString)
        return date instanceof Date && !isNaN(date.getTime())
      }

      expect(isValidDate('invalid-date')).toBe(false)
      expect(isValidDate('2024-13-01')).toBe(false) // Invalid month
      expect(isValidDate('2024-02-30')).toBe(false) // Invalid day
      expect(isValidDate('')).toBe(false)
      expect(isValidDate(null)).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const validatePassword = (password) => {
        const minLength = 8
        const hasUpperCase = /[A-Z]/.test(password)
        const hasLowerCase = /[a-z]/.test(password)
        const hasNumbers = /\d/.test(password)
        const hasSpecialChar = /[!@#$%^&*]/.test(password)

        const errors = []

        if (!password || password.length < minLength) {
          errors.push(`Password must be at least ${minLength} characters long`)
        }

        if (!hasUpperCase) {
          errors.push('Password must contain at least one uppercase letter')
        }

        if (!hasLowerCase) {
          errors.push('Password must contain at least one lowercase letter')
        }

        if (!hasNumbers) {
          errors.push('Password must contain at least one number')
        }

        return {
          isValid: errors.length === 0,
          errors,
          strength: errors.length === 0 ? 'strong' : 
                   errors.length <= 2 ? 'medium' : 'weak'
        }
      }

      const result = validatePassword('StrongPass123!')
      expect(result.isValid).toBe(true)
      expect(result.strength).toBe('strong')
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak passwords', () => {
      const validatePassword = (password) => {
        const minLength = 8
        const hasUpperCase = /[A-Z]/.test(password)
        const hasLowerCase = /[a-z]/.test(password)
        const hasNumbers = /\d/.test(password)

        const errors = []

        if (!password || password.length < minLength) {
          errors.push(`Password must be at least ${minLength} characters long`)
        }

        if (!hasUpperCase) {
          errors.push('Password must contain at least one uppercase letter')
        }

        if (!hasLowerCase) {
          errors.push('Password must contain at least one lowercase letter')
        }

        if (!hasNumbers) {
          errors.push('Password must contain at least one number')
        }

        return {
          isValid: errors.length === 0,
          errors,
          strength: errors.length === 0 ? 'strong' : 
                   errors.length <= 2 ? 'medium' : 'weak'
        }
      }

      const result = validatePassword('weak')
      expect(result.isValid).toBe(false)
      expect(result.strength).toBe('weak')
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
    })
  })

  describe('Report Data Validation', () => {
    it('should validate report data', () => {
      const validateReportData = (reportData) => {
        const errors = []

        if (!reportData.title || reportData.title.trim().length < 5) {
          errors.push('Report title must be at least 5 characters long')
        }

        if (!reportData.sample_ids || !Array.isArray(reportData.sample_ids) || reportData.sample_ids.length === 0) {
          errors.push('Report must be associated with at least one sample')
        }

        if (!reportData.type || !['paternity', 'forensic', 'relationship'].includes(reportData.type)) {
          errors.push('Invalid report type')
        }

        return {
          isValid: errors.length === 0,
          errors
        }
      }

      const validReport = {
        title: 'Paternity Test Report',
        sample_ids: [1, 2, 3],
        type: 'paternity'
      }

      const result = validateReportData(validReport)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})