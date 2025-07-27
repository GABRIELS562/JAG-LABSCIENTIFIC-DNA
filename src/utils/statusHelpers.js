/**
 * Centralized status management utilities
 * Used across Reports, SampleSearch, and other components
 */

/**
 * Get status icon props for different status types
 * @param {string} status - The status value
 * @returns {object} - Icon component and color props
 */
export const getStatusIconProps = (status) => {
  if (!status) return { icon: 'PendingIcon', color: 'disabled' };
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'analysis_completed':
      return { icon: 'CheckCircleIcon', color: 'success' };
    case 'processing':
    case 'pcr_batched':
    case 'electro_batched':
      return { icon: 'ScienceIcon', color: 'warning' };
    case 'pending':
    case 'sample_collected':
      return { icon: 'PendingIcon', color: 'warning' };
    case 'sent':
      return { icon: 'SendIcon', color: 'primary' };
    case 'archived':
      return { icon: 'ArchiveIcon', color: 'disabled' };
    case 'error':
    case 'failed':
      return { icon: 'ErrorIcon', color: 'error' };
    default:
      return { icon: 'PendingIcon', color: 'disabled' };
  }
};

/**
 * Get status color for Chip components
 * @param {string} status - The status value
 * @returns {string} - Material-UI color variant
 */
export const getStatusColor = (status) => {
  if (!status) return 'default';
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'analysis_completed':
      return 'success';
    case 'processing':
    case 'pcr_batched':
    case 'electro_batched':
      return 'warning';
    case 'pending':
    case 'sample_collected':
      return 'info';
    case 'sent':
      return 'primary';
    case 'error':
    case 'failed':
      return 'error';
    case 'archived':
    default:
      return 'default';
  }
};

/**
 * Get batch type color for different batch types
 * @param {string} batchType - The batch type
 * @returns {string} - Material-UI color variant
 */
export const getBatchTypeColor = (batchType) => {
  if (!batchType) return 'default';
  
  switch (batchType.toLowerCase()) {
    case 'legal':
      return 'error';
    case 'peace_of_mind':
      return 'info';
    case 'standard':
    default:
      return 'default';
  }
};

/**
 * Get human-readable batch type label
 * @param {string} batchType - The batch type
 * @returns {string} - Formatted label
 */
export const getBatchTypeLabel = (batchType) => {
  if (!batchType) return 'Standard';
  
  switch (batchType.toLowerCase()) {
    case 'legal':
      return 'Legal';
    case 'peace_of_mind':
      return 'Peace of Mind';
    case 'standard':
    default:
      return 'Standard';
  }
};

/**
 * Format date strings consistently across the application
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format date and time strings consistently
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date and time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Get workflow status display text
 * @param {string} workflowStatus - The workflow status
 * @returns {string} - Human-readable status
 */
export const getWorkflowStatusText = (workflowStatus) => {
  if (!workflowStatus) return 'Unknown';
  
  const statusMap = {
    'sample_collected': 'Sample Collected',
    'pcr_ready': 'PCR Ready',
    'pcr_batched': 'PCR Batched',
    'pcr_completed': 'PCR Completed',
    'electro_ready': 'Electrophoresis Ready',
    'electro_batched': 'Electrophoresis Batched',
    'electro_completed': 'Electrophoresis Completed',
    'analysis_ready': 'Analysis Ready',
    'analysis_completed': 'Analysis Completed',
    'report_ready': 'Report Ready',
    'report_sent': 'Report Sent'
  };
  
  return statusMap[workflowStatus] || workflowStatus;
};

/**
 * Check if a status indicates completion
 * @param {string} status - The status to check
 * @returns {boolean} - Whether the status indicates completion
 */
export const isCompletedStatus = (status) => {
  if (!status) return false;
  
  const completedStatuses = [
    'completed',
    'analysis_completed',
    'report_sent',
    'sent',
    'archived'
  ];
  
  return completedStatuses.includes(status.toLowerCase());
};

/**
 * Check if a status indicates active processing
 * @param {string} status - The status to check
 * @returns {boolean} - Whether the status indicates active processing
 */
export const isProcessingStatus = (status) => {
  if (!status) return false;
  
  const processingStatuses = [
    'processing',
    'pcr_batched',
    'electro_batched',
    'pcr_ready',
    'electro_ready',
    'analysis_ready'
  ];
  
  return processingStatuses.includes(status.toLowerCase());
};