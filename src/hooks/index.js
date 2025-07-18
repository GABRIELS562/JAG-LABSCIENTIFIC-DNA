// Export all custom hooks from a central location
export { useApiData, useApiCall, useApiMultiple } from './useApiData';
export { useForm, useMultiStepForm } from './useForm';
export { useTable, useTableSelection } from './useTable';
export { 
  useNotifications, 
  useLoadingWithNotifications, 
  useModal, 
  useAsyncOperation 
} from './useNotifications';

// Re-export existing hooks for backwards compatibility
export { useTheme } from './useTheme';

// Hook combinations for common patterns
export { default as useApiData } from './useApiData';
export { default as useForm } from './useForm';
export { default as useTable } from './useTable';
export { default as useNotifications } from './useNotifications';