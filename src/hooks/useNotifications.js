import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing notifications/toast messages
 * @param {Object} options - Configuration options
 * @returns {Object} Notification state and handlers
 */
export function useNotifications(options = {}) {
  const {
    maxNotifications = 5,
    defaultDuration = 5000,
    position = 'top-right'
  } = options;

  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);

  const addNotification = useCallback((notification) => {
    const id = ++notificationIdRef.current;
    const newNotification = {
      id,
      type: 'info',
      duration: defaultDuration,
      ...notification,
      timestamp: Date.now()
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [defaultDuration, maxNotifications]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const success = useCallback((message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  }, [addNotification]);

  const error = useCallback((message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      duration: 0, // Error notifications don't auto-dismiss by default
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      ...options
    });
  }, [addNotification]);

  const info = useCallback((message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info,
    position
  };
}

/**
 * Custom hook for managing loading states with notifications
 * @param {Object} options - Configuration options
 * @returns {Object} Loading state and handlers
 */
export function useLoadingWithNotifications(options = {}) {
  const {
    successMessage = 'Operation completed successfully',
    errorMessage = 'An error occurred',
    loadingMessage = 'Loading...'
  } = options;

  const [loading, setLoading] = useState(false);
  const notifications = useNotifications();

  const executeWithLoading = useCallback(async (asyncFunction, customMessages = {}) => {
    const messages = { successMessage, errorMessage, loadingMessage, ...customMessages };
    
    try {
      setLoading(true);
      
      if (messages.loadingMessage) {
        notifications.info(messages.loadingMessage, { duration: 0 });
      }
      
      const result = await asyncFunction();
      
      if (messages.successMessage) {
        notifications.success(messages.successMessage);
      }
      
      return result;
    } catch (error) {
      if (messages.errorMessage) {
        const errorMsg = error.message || messages.errorMessage;
        notifications.error(errorMsg);
      }
      throw error;
    } finally {
      setLoading(false);
      notifications.clearAllNotifications();
    }
  }, [successMessage, errorMessage, loadingMessage, notifications]);

  return {
    loading,
    executeWithLoading,
    ...notifications
  };
}

/**
 * Custom hook for managing modal/dialog state
 * @param {Boolean} initialOpen - Initial open state
 * @returns {Object} Modal state and handlers
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle
  };
}

/**
 * Custom hook for managing async operations with state tracking
 * @param {Function} asyncFunction - The async function to execute
 * @param {Object} options - Configuration options
 * @returns {Object} Async operation state and handlers
 */
export function useAsyncOperation(asyncFunction, options = {}) {
  const {
    onSuccess = null,
    onError = null,
    immediate = false
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
    executed: false
  });

  const execute = useCallback(async (...args) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const result = await asyncFunction(...args);
      
      setState({
        data: result,
        loading: false,
        error: null,
        executed: true
      });

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'An error occurred',
        executed: true
      }));

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }, [asyncFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      executed: false
    });
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset
  };
}

export default useNotifications;