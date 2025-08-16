import { useEffect, useState, useCallback, useRef } from 'react';
import webSocketService from '../services/websocketService';

/**
 * Custom hook for WebSocket functionality
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto connect on mount (default: true)
 * @param {Array} options.events - Array of events to listen for
 * @returns {Object} WebSocket state and methods
 */
export const useWebSocket = (options = {}) => {
  const {
    autoConnect = true,
    events = []
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const eventListeners = useRef([]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    webSocketService.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Subscribe to events
  const subscribe = useCallback((event, callback) => {
    const unsubscribe = webSocketService.on(event, callback);
    eventListeners.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // Emit event
  const emit = useCallback((event, data) => {
    webSocketService.emit(event, data);
  }, []);

  useEffect(() => {
    // Auto connect if enabled
    if (autoConnect) {
      connect();
    }

    // Set up connection status listener
    const connectionUnsubscribe = webSocketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        setConnectionError(null);
      }
    });

    // Set up connection error listener
    const errorUnsubscribe = webSocketService.on('connection_error', (error) => {
      setConnectionError(error);
    });

    // Set up general message listener
    const messageUnsubscribe = webSocketService.on('*', (data) => {
      setLastMessage({ timestamp: Date.now(), data });
    });

    // Subscribe to specified events
    events.forEach(event => {
      const unsubscribe = webSocketService.on(event, (data) => {
        setLastMessage({ event, timestamp: Date.now(), data });
      });
      eventListeners.current.push(unsubscribe);
    });

    eventListeners.current.push(connectionUnsubscribe, errorUnsubscribe, messageUnsubscribe);

    // Initial state
    setIsConnected(webSocketService.isSocketConnected());

    return () => {
      // Cleanup all listeners
      eventListeners.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      eventListeners.current = [];
    };
  }, [autoConnect, events, connect]);

  return {
    isConnected,
    connectionError,
    lastMessage,
    connect,
    disconnect,
    subscribe,
    emit,
    socket: webSocketService.socket
  };
};

/**
 * Hook for listening to real-time sample updates
 */
export const useSampleUpdates = () => {
  const [sampleUpdates, setSampleUpdates] = useState([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('sample_updated', (data) => {
      setSampleUpdates(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 updates
    });

    return unsubscribe;
  }, [subscribe]);

  return sampleUpdates;
};

/**
 * Hook for listening to real-time batch updates
 */
export const useBatchUpdates = () => {
  const [batchUpdates, setBatchUpdates] = useState([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('batch_updated', (data) => {
      setBatchUpdates(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 updates
    });

    return unsubscribe;
  }, [subscribe]);

  return batchUpdates;
};

/**
 * Hook for managing notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Load initial notifications
    setNotifications(webSocketService.getNotifications());
    setUnreadCount(webSocketService.getUnreadNotifications().length);

    // Subscribe to new notifications
    const unsubscribeNotification = subscribe('notification', () => {
      setNotifications(webSocketService.getNotifications());
      setUnreadCount(webSocketService.getUnreadNotifications().length);
    });

    const unsubscribeUpdate = subscribe('notification_updated', () => {
      setNotifications(webSocketService.getNotifications());
      setUnreadCount(webSocketService.getUnreadNotifications().length);
    });

    const unsubscribeAllRead = subscribe('all_notifications_read', () => {
      setNotifications(webSocketService.getNotifications());
      setUnreadCount(0);
    });

    const unsubscribeCleared = subscribe('notifications_cleared', () => {
      setNotifications([]);
      setUnreadCount(0);
    });

    return () => {
      unsubscribeNotification();
      unsubscribeUpdate();
      unsubscribeAllRead();
      unsubscribeCleared();
    };
  }, [subscribe]);

  const markAsRead = useCallback((notificationId) => {
    webSocketService.markNotificationAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(() => {
    webSocketService.markAllNotificationsAsRead();
  }, []);

  const clearAll = useCallback(() => {
    webSocketService.clearNotifications();
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};

/**
 * Hook for connection status monitoring
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState({
    isConnected: false,
    reconnectAttempts: 0,
    lastError: null
  });

  const { subscribe } = useWebSocket({ autoConnect: false });

  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      isConnected: webSocketService.isSocketConnected()
    }));

    const unsubscribeConnection = webSocketService.onConnectionChange((connected) => {
      setStatus(prev => ({
        ...prev,
        isConnected: connected,
        lastError: connected ? null : prev.lastError
      }));
    });

    const unsubscribeError = subscribe('connection_error', (error) => {
      setStatus(prev => ({
        ...prev,
        reconnectAttempts: error.attempts || 0,
        lastError: error.error
      }));
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
    };
  }, [subscribe]);

  return status;
};

export default useWebSocket;