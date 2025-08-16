import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.notifications = [];
    this.listeners = new Map();
    this.connectionListeners = [];
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return;
    }

    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Authenticate if user data is available
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.id) {
        this.authenticate(userData);
      }

      // Notify connection listeners
      this.connectionListeners.forEach(callback => callback(true));
      this.emit('connection', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.connectionListeners.forEach(callback => callback(false));
      this.emit('connection', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🗲 WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection_error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('authenticated', (data) => {
      this.emit('authenticated', data);
    });

    // Notification handlers
    this.socket.on('notification', (notification) => {
      this.handleNotification(notification);
    });

    // Real-time update handlers
    this.socket.on('sample_updated', (data) => {
      this.emit('sample_updated', data);
    });

    this.socket.on('batch_updated', (data) => {
      this.emit('batch_updated', data);
    });

    // Keep connection alive
    this.socket.on('pong', () => {
      // Connection is alive
    });

    // Set up ping interval
    setInterval(() => {
      if (this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  authenticate(userData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', {
        userId: userData.id,
        role: userData.role,
        username: userData.username
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in WebSocket event listener:', error);
      }
    });
  }

  // Connection status
  onConnectionChange(callback) {
    this.connectionListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(callback);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Notification management
  handleNotification(notification) {
    // Add to local notifications array
    this.notifications.unshift({
      ...notification,
      read: false,
      receivedAt: new Date().toISOString()
    });

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    // Save to localStorage for persistence
    localStorage.setItem('websocket_notifications', JSON.stringify(this.notifications));

    // Emit to listeners
    this.emit('notification', notification);

    // Show browser notification if permission granted
    this.showBrowserNotification(notification);
  }

  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const options = {
        body: notification.message,
        icon: '/labdna-logo-light.png',
        badge: '/labdna-logo-light.png',
        tag: notification.id,
        renotify: true,
        requireInteraction: notification.priority === 'high',
        actions: [
          {
            action: 'view',
            title: 'View Details'
          }
        ]
      };

      const browserNotification = new Notification(notification.title, options);

      browserNotification.onclick = () => {
        window.focus();
        this.emit('notification_clicked', notification);
        browserNotification.close();
      };

      // Auto-close after 5 seconds for non-high priority notifications
      if (notification.priority !== 'high') {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Get notifications
  getNotifications() {
    return this.notifications;
  }

  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      localStorage.setItem('websocket_notifications', JSON.stringify(this.notifications));
      this.emit('notification_updated', notification);
    }
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach(n => n.read = true);
    localStorage.setItem('websocket_notifications', JSON.stringify(this.notifications));
    this.emit('all_notifications_read');
  }

  clearNotifications() {
    this.notifications = [];
    localStorage.removeItem('websocket_notifications');
    this.emit('notifications_cleared');
  }

  // Load persisted notifications
  loadPersistedNotifications() {
    try {
      const stored = localStorage.getItem('websocket_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading persisted notifications:', error);
      this.notifications = [];
    }
  }
}

// Singleton instance
const webSocketService = new WebSocketService();

// Load persisted notifications on initialization
webSocketService.loadPersistedNotifications();

export default webSocketService;