/**
 * Input Validation Middleware
 * Provides comprehensive input validation and sanitization
 */

/**
 * Sanitize string input - escape HTML entities
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Check if string contains only alphanumeric and dashes
 */
const isAlphanumericDash = (str) => {
  return /^[a-zA-Z0-9-]+$/.test(str);
};

/**
 * Check if string contains only letters and spaces
 */
const isAlphaSpace = (str) => {
  return /^[a-zA-Z\s]+$/.test(str);
};

/**
 * Check if valid date format
 */
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate and sanitize sample data
 */
const validateSample = (req, res, next) => {
  const errors = [];
  const {
    lab_number,
    case_number,
    name,
    surname,
    relation,
    sample_type,
    collection_date
  } = req.body;

  // Required field validation
  if (!lab_number || !isAlphanumericDash(lab_number)) {
    errors.push('Invalid lab number format');
  }

  if (!case_number || !isAlphanumericDash(case_number)) {
    errors.push('Invalid case number format');
  }

  if (!name || !isAlphaSpace(name)) {
    errors.push('Invalid name format');
  }

  if (!surname || !isAlphaSpace(surname)) {
    errors.push('Invalid surname format');
  }

  const validRelations = ['Father', 'Mother', 'Child', 'Alleged Father', 'Sibling', 'Other'];
  if (!relation || !validRelations.includes(relation)) {
    errors.push('Invalid relation type');
  }

  const validSampleTypes = ['Buccal Swab', 'Blood', 'Hair', 'Saliva', 'Other'];
  if (sample_type && !validSampleTypes.includes(sample_type)) {
    errors.push('Invalid sample type');
  }

  if (collection_date && !isValidDate(collection_date)) {
    errors.push('Invalid collection date format');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  // Sanitize input
  req.body = {
    ...req.body,
    lab_number: sanitizeString(lab_number),
    case_number: sanitizeString(case_number),
    name: sanitizeString(name),
    surname: sanitizeString(surname),
    relation: sanitizeString(relation),
    sample_type: sample_type ? sanitizeString(sample_type) : 'Buccal Swab'
  };

  next();
};

/**
 * Validate query parameters
 */
const validateQuery = (req, res, next) => {
  const { limit, offset, search, status, workflow_status } = req.query;

  // Validate limit
  if (limit) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter (1-500)'
      });
    }
    req.query.limit = limitNum;
  }

  // Validate offset
  if (offset) {
    const offsetNum = parseInt(offset, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offset parameter'
      });
    }
    req.query.offset = offsetNum;
  }

  // Sanitize search
  if (search) {
    req.query.search = sanitizeString(search);
  }

  // Validate status
  const validStatuses = ['pending', 'completed', 'failed', 'in_progress'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status parameter'
    });
  }

  next();
};

/**
 * Validate ID parameter
 */
const validateId = (req, res, next) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10);

  if (!id || isNaN(idNum) || idNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID parameter'
    });
  }

  req.params.id = idNum;
  next();
};

/**
 * Validate batch operation
 */
const validateBatch = (req, res, next) => {
  const { sampleIds, batchType } = req.body;

  if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sample IDs array'
    });
  }

  // Validate each ID
  const validIds = [];
  for (const id of sampleIds) {
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sample ID in array'
      });
    }
    validIds.push(idNum);
  }

  const validBatchTypes = ['pcr', 'electrophoresis'];
  if (!batchType || !validBatchTypes.includes(batchType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid batch type'
    });
  }

  req.body.sampleIds = validIds;
  next();
};

/**
 * Prevent SQL injection in raw queries
 */
const sanitizeSQLInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove dangerous SQL keywords and characters
  return input
    .replace(/[;'"\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '');
};

module.exports = {
  validateSample,
  validateQuery,
  validateId,
  validateBatch,
  sanitizeString,
  sanitizeSQLInput
};