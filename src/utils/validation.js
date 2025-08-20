// Comprehensive validation utilities for frontend

/**
 * Validation utility functions for forms and data
 */

/**
 * Sample data validation
 */
export const validateSampleData = (data) => {
  const errors = {};

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  } else if (data.name.trim().length > 50) {
    errors.name = 'Name must be less than 50 characters';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.name.trim())) {
    errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Surname validation
  if (!data.surname || typeof data.surname !== 'string') {
    errors.surname = 'Surname is required';
  } else if (data.surname.trim().length < 2) {
    errors.surname = 'Surname must be at least 2 characters long';
  } else if (data.surname.trim().length > 50) {
    errors.surname = 'Surname must be less than 50 characters';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.surname.trim())) {
    errors.surname = 'Surname can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Relation validation
  const validRelations = ['Child', 'Father', 'Mother', 'Alleged Father', 'Sibling'];
  if (!data.relation) {
    errors.relation = 'Relation is required';
  } else if (!validRelations.includes(data.relation)) {
    errors.relation = `Relation must be one of: ${validRelations.join(', ')}`;
  }

  // Lab number validation
  if (!data.lab_number || typeof data.lab_number !== 'string') {
    errors.lab_number = 'Lab number is required';
  } else if (!/^(LT)?\d{2}_\d+$/.test(data.lab_number.trim())) {
    errors.lab_number = 'Lab number must follow format: {YY}_{number} or LT{YY}_{number}';
  }

  // Email validation (optional)
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
  }

  // Phone number validation (optional)
  if (data.phone_number && data.phone_number.trim()) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = data.phone_number.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.phone_number = 'Please provide a valid phone number';
    }
  }

  // Date of birth validation (optional)
  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    const today = new Date();
    
    if (isNaN(dob.getTime())) {
      errors.date_of_birth = 'Please provide a valid date';
    } else if (dob > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future';
    } else if (today.getFullYear() - dob.getFullYear() > 150) {
      errors.date_of_birth = 'Date of birth seems invalid (over 150 years ago)';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Batch data validation
 */
export const validateBatchData = (data) => {
  const errors = {};

  // Batch number validation
  if (!data.batchNumber || typeof data.batchNumber !== 'string') {
    errors.batchNumber = 'Batch number is required';
  } else if (data.batchNumber.trim().length < 3) {
    errors.batchNumber = 'Batch number must be at least 3 characters';
  } else if (!/^(LDS_|ELEC_|RR_)\d+(_RR)?$/.test(data.batchNumber.trim())) {
    errors.batchNumber = 'Invalid batch number format';
  }

  // Operator validation
  if (!data.operator || typeof data.operator !== 'string') {
    errors.operator = 'Operator name is required';
  } else if (data.operator.trim().length < 2) {
    errors.operator = 'Operator name must be at least 2 characters';
  } else if (data.operator.trim().length > 100) {
    errors.operator = 'Operator name must be less than 100 characters';
  }

  // Date validation
  if (data.date) {
    const date = new Date(data.date);
    const today = new Date();
    
    if (isNaN(date.getTime())) {
      errors.date = 'Please provide a valid date';
    } else if (date > today) {
      errors.date = 'Date cannot be in the future';
    }
  }

  // Sample count validation
  if (data.sampleCount !== undefined) {
    const count = parseInt(data.sampleCount);
    if (isNaN(count) || count < 1 || count > 96) {
      errors.sampleCount = 'Sample count must be between 1 and 96';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Well position validation
 */
export const validateWellPosition = (position) => {
  if (!position || typeof position !== 'string') {
    return { isValid: false, error: 'Well position is required' };
  }

  const wellRegex = /^[A-H](0[1-9]|1[0-2])$/;
  if (!wellRegex.test(position.trim())) {
    return { isValid: false, error: 'Well position must be in format A01-H12' };
  }

  return { isValid: true };
};

/**
 * Email validation
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please provide a valid email address' };
  }

  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * File validation
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = true
  } = options;

  if (!file) {
    return { isValid: !required, error: required ? 'File is required' : null };
  }

  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB` 
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type must be one of: ${allowedTypes.join(', ')}` 
    };
  }

  return { isValid: true };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

/**
 * Validate and sanitize form data
 */
export const validateAndSanitizeFormData = (data, validationRules) => {
  const sanitizedData = {};
  const errors = {};

  for (const [field, value] of Object.entries(data)) {
    // Sanitize the value
    sanitizedData[field] = typeof value === 'string' ? sanitizeInput(value) : value;

    // Apply validation rules if they exist
    if (validationRules[field]) {
      const validation = validationRules[field](sanitizedData[field]);
      if (!validation.isValid) {
        errors[field] = validation.error || validation.errors;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    data: sanitizedData,
    errors
  };
};

/**
 * Batch validation for multiple items
 */
export const validateBatch = (items, validationFn) => {
  const results = [];
  let hasErrors = false;

  items.forEach((item, index) => {
    const validation = validationFn(item);
    results.push({
      index,
      ...validation,
      item
    });

    if (!validation.isValid) {
      hasErrors = true;
    }
  });

  return {
    isValid: !hasErrors,
    results,
    validItems: results.filter(r => r.isValid).map(r => r.item),
    invalidItems: results.filter(r => !r.isValid)
  };
};

/**
 * Real-time validation debounced
 */
export const createDebouncedValidator = (validationFn, delay = 300) => {
  let timeoutId;
  
  return (value, callback) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validationFn(value);
      callback(result);
    }, delay);
  };
};

/**
 * Custom validation rules builder
 */
export const ValidationRules = {
  required: (message = 'This field is required') => (value) => ({
    isValid: value !== null && value !== undefined && value !== '',
    error: message
  }),

  minLength: (min, message) => (value) => ({
    isValid: !value || value.length >= min,
    error: message || `Must be at least ${min} characters`
  }),

  maxLength: (max, message) => (value) => ({
    isValid: !value || value.length <= max,
    error: message || `Must be no more than ${max} characters`
  }),

  pattern: (regex, message) => (value) => ({
    isValid: !value || regex.test(value),
    error: message || 'Invalid format'
  }),

  email: (message = 'Please provide a valid email address') => (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: !value || emailRegex.test(value),
      error: message
    };
  },

  numeric: (message = 'Must be a number') => (value) => ({
    isValid: !value || !isNaN(Number(value)),
    error: message
  }),

  min: (minimum, message) => (value) => ({
    isValid: !value || Number(value) >= minimum,
    error: message || `Must be at least ${minimum}`
  }),

  max: (maximum, message) => (value) => ({
    isValid: !value || Number(value) <= maximum,
    error: message || `Must be no more than ${maximum}`
  }),

  custom: (validationFn, message) => (value) => {
    try {
      const isValid = validationFn(value);
      return {
        isValid,
        error: isValid ? null : message
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Validation error occurred'
      };
    }
  }
};

/**
 * Chain multiple validation rules
 */
export const chain = (...rules) => (value) => {
  for (const rule of rules) {
    const result = rule(value);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
};

export default {
  validateSampleData,
  validateBatchData,
  validateWellPosition,
  validateEmail,
  validatePassword,
  validateFile,
  sanitizeInput,
  validateAndSanitizeFormData,
  validateBatch,
  createDebouncedValidator,
  ValidationRules,
  chain
};