const { ValidationError } = require('./errorHandler');

const validateSampleData = (req, res, next) => {
  const { name, surname, relation, lab_number } = req.body;
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }

  if (!surname || surname.trim().length < 2) {
    errors.surname = 'Surname must be at least 2 characters long';
  }

  if (!relation || !['Child', 'Father', 'Mother', 'Alleged Father'].includes(relation)) {
    errors.relation = 'Relation must be one of: Child, Father, Mother, Alleged Father';
  }

  if (!lab_number || !/^(LT)?\d{2}_\d+$/.test(lab_number)) {
    errors.lab_number = 'Lab number must follow format: {YY}_{number} or LT{YY}_{number}';
  }

  if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
    errors.email = 'Please provide a valid email address';
  }

  if (req.body.phone_number && !/^[\+]?[1-9][\d]{0,15}$/.test(req.body.phone_number.replace(/[\s\-\(\)]/g, ''))) {
    errors.phone_number = 'Please provide a valid phone number';
  }

  if (req.body.date_of_birth) {
    const dob = new Date(req.body.date_of_birth);
    const today = new Date();
    if (dob > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future';
    }
    if (today.getFullYear() - dob.getFullYear() > 150) {
      errors.date_of_birth = 'Date of birth seems invalid (over 150 years ago)';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  next();
};

const validateTestCaseData = (req, res, next) => {
  const { case_number, ref_kit_number, submission_date, client_type } = req.body;
  const errors = {};

  if (!case_number || !/^CASE_\d{4}_\d{3}$/.test(case_number)) {
    errors.case_number = 'Case number must follow format: CASE_YYYY_XXX';
  }

  if (!ref_kit_number || ref_kit_number.trim().length < 3) {
    errors.ref_kit_number = 'Reference kit number must be at least 3 characters';
  }

  if (!submission_date) {
    errors.submission_date = 'Submission date is required';
  } else {
    const submissionDate = new Date(submission_date);
    const today = new Date();
    if (submissionDate > today) {
      errors.submission_date = 'Submission date cannot be in the future';
    }
  }

  if (!client_type || !['paternity', 'lt', 'urgent'].includes(client_type)) {
    errors.client_type = 'Client type must be one of: paternity, lt, urgent';
  }

  if (req.body.email_contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email_contact)) {
    errors.email_contact = 'Please provide a valid email address';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Test case validation failed', errors);
  }

  next();
};

const validateBatchData = (req, res, next) => {
  const { batch_number, operator } = req.body;
  const errors = {};

  if (!batch_number || batch_number.trim().length < 3) {
    errors.batch_number = 'Batch number must be at least 3 characters';
  }

  if (!operator || operator.trim().length < 2) {
    errors.operator = 'Operator name must be at least 2 characters';
  }

  if (req.body.pcr_date) {
    const pcrDate = new Date(req.body.pcr_date);
    const today = new Date();
    if (pcrDate > today) {
      errors.pcr_date = 'PCR date cannot be in the future';
    }
  }

  if (req.body.electro_date) {
    const electroDate = new Date(req.body.electro_date);
    const today = new Date();
    if (electroDate > today) {
      errors.electro_date = 'Electrophoresis date cannot be in the future';
    }
  }

  if (req.body.total_samples && (req.body.total_samples < 1 || req.body.total_samples > 96)) {
    errors.total_samples = 'Total samples must be between 1 and 96';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Batch validation failed', errors);
  }

  next();
};

const validateWellAssignment = (req, res, next) => {
  const { batch_id, well_position, well_type } = req.body;
  const errors = {};

  if (!batch_id || !Number.isInteger(batch_id) || batch_id <= 0) {
    errors.batch_id = 'Valid batch ID is required';
  }

  if (!well_position || !/^[A-H](0[1-9]|1[0-2])$/.test(well_position)) {
    errors.well_position = 'Well position must be in format A01-H12';
  }

  if (!well_type || !['Sample', 'Blank', 'Allelic Ladder', 'Positive Control', 'Negative Control'].includes(well_type)) {
    errors.well_type = 'Well type must be one of: Sample, Blank, Allelic Ladder, Positive Control, Negative Control';
  }

  if (well_type === 'Sample' && !req.body.sample_id) {
    errors.sample_id = 'Sample ID is required for sample wells';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Well assignment validation failed', errors);
  }

  next();
};

const validateGeneticCaseData = (req, res, next) => {
  const { case_id, case_type } = req.body;
  const errors = {};

  if (!case_id || !/^PAT-\d{4}-\d{3}$/.test(case_id)) {
    errors.case_id = 'Case ID must follow format: PAT-YYYY-XXX';
  }

  if (!case_type || !['paternity', 'maternity', 'siblingship'].includes(case_type)) {
    errors.case_type = 'Case type must be one of: paternity, maternity, siblingship';
  }

  if (req.body.priority && (req.body.priority < 1 || req.body.priority > 10)) {
    errors.priority = 'Priority must be between 1 and 10';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Genetic case validation failed', errors);
  }

  next();
};

const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    req.query.page = 1;
  } else {
    req.query.page = Number(page) || 1;
  }

  if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    req.query.limit = 20;
  } else {
    req.query.limit = Number(limit) || 20;
  }

  next();
};

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

module.exports = {
  validateSampleData,
  validateTestCaseData,
  validateBatchData,
  validateWellAssignment,
  validateGeneticCaseData,
  validatePagination,
  sanitizeInput
};