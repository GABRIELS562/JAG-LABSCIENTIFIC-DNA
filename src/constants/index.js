/**
 * Application Constants
 * Centralized constants to replace magic numbers and strings
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
};

// Dashboard Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DASHBOARD: 10000, // 10 seconds - balance between real-time updates and performance
  WORKFLOW: 5000, // 5 seconds - more frequent for active workflows
  METRICS: 30000, // 30 seconds - less frequent for aggregate metrics
  CACHE: 60000 // 1 minute - cache TTL
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 50, // Default items per page
  MAX_LIMIT: 500, // Maximum items allowed per request
  MIN_LIMIT: 10, // Minimum items per page
  DEFAULT_OFFSET: 0
};

// Workflow Stages
export const WORKFLOW_STAGES = {
  SAMPLE_COLLECTED: 'sample_collected',
  DNA_EXTRACTION: 'dna_extraction',
  PCR_READY: 'pcr_ready',
  PCR_BATCHED: 'pcr_batched',
  PCR_COMPLETED: 'pcr_completed',
  ELECTRO_READY: 'electro_ready',
  ELECTRO_BATCHED: 'electro_batched',
  ELECTRO_COMPLETED: 'electro_completed',
  ANALYSIS_READY: 'analysis_ready',
  ANALYSIS_COMPLETED: 'analysis_completed',
  REPORT_READY: 'report_ready',
  REPORT_SENT: 'report_sent'
};

// Batch Configuration
export const BATCH_CONFIG = {
  PCR_BATCH_SIZE: 20, // Maximum samples per PCR batch
  ELECTROPHORESIS_BATCH_SIZE: 15, // Maximum samples per electrophoresis batch
  MIN_BATCH_SIZE: 5, // Minimum samples to create a batch
  AUTO_BATCH_THRESHOLD: 18 // Threshold to auto-create batch
};

// Sample Status
export const SAMPLE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RERUN: 'rerun'
};

// Relations
export const RELATIONS = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  CHILD: 'Child',
  ALLEGED_FATHER: 'Alleged Father',
  SIBLING: 'Sibling',
  OTHER: 'Other'
};

// Sample Types
export const SAMPLE_TYPES = {
  BUCCAL_SWAB: 'Buccal Swab',
  BLOOD: 'Blood',
  HAIR: 'Hair',
  SALIVA: 'Saliva',
  OTHER: 'Other'
};

// Chart Configuration
export const CHART_CONFIG = {
  MAX_DATA_POINTS: 100, // Maximum data points to display
  ANIMATION_DURATION: 750, // Chart animation duration in ms
  COLORS: {
    PRIMARY: '#3b82f6',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#6366f1'
  }
};

// Form Validation
export const VALIDATION = {
  LAB_NUMBER_PATTERN: /^[A-Z0-9-]+$/,
  CASE_NUMBER_PATTERN: /^[A-Z0-9-]+$/,
  NAME_PATTERN: /^[a-zA-Z\s]+$/,
  MAX_NAME_LENGTH: 100,
  MAX_NOTES_LENGTH: 500,
  MIN_NAME_LENGTH: 2
};

// Memory Management
export const MEMORY_LIMITS = {
  MAX_SAMPLES_IN_MEMORY: 100, // Maximum samples to keep in memory
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB cache limit
  CLEANUP_THRESHOLD: 80 // Start cleanup at 80% capacity
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please refresh the page.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAMPLE_CREATED: 'Sample created successfully',
  SAMPLE_UPDATED: 'Sample updated successfully',
  BATCH_CREATED: 'Batch created successfully',
  WORKFLOW_PROGRESSED: 'Workflow progressed successfully',
  DATA_EXPORTED: 'Data exported successfully'
};

export default {
  API_CONFIG,
  REFRESH_INTERVALS,
  PAGINATION,
  WORKFLOW_STAGES,
  BATCH_CONFIG,
  SAMPLE_STATUS,
  RELATIONS,
  SAMPLE_TYPES,
  CHART_CONFIG,
  VALIDATION,
  MEMORY_LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};