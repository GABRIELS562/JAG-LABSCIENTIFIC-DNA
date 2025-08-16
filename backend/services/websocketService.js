const { Server } = require('socket.io');
const { logger } = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Store client info
      this.connectedClients.set(socket.id, {
        socket,
        userId: null,
        role: null,
        connectedAt: new Date()
      });

      // Handle authentication
      socket.on('authenticate', (data) => {
        const { userId, role, username } = data;
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.userId = userId;
          client.role = role;
          client.username = username;
          socket.join(`user_${userId}`);
          socket.join(`role_${role}`);
          
          logger.info(`User authenticated via WebSocket: ${username} (${role})`);
          socket.emit('authenticated', { success: true });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle ping for connection monitoring
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  // Notification methods
  notifyUser(userId, notification) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
        id: this.generateNotificationId()
      });
      logger.info(`Notification sent to user ${userId}: ${notification.type}`);
    }
  }

  notifyRole(role, notification) {
    if (this.io) {
      this.io.to(`role_${role}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
        id: this.generateNotificationId()
      });
      logger.info(`Notification sent to role ${role}: ${notification.type}`);
    }
  }

  broadcastNotification(notification) {
    if (this.io) {
      this.io.emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
        id: this.generateNotificationId()
      });
      logger.info(`Broadcast notification: ${notification.type}`);
    }
  }

  // Sample workflow notifications
  notifySampleStatusChange(sampleId, oldStatus, newStatus, userId = null) {
    const notification = {
      type: 'sample_status_update',
      title: 'Sample Status Updated',
      message: `Sample ${sampleId} status changed from ${oldStatus} to ${newStatus}`,
      data: { sampleId, oldStatus, newStatus },
      priority: 'medium'
    };

    if (userId) {
      this.notifyUser(userId, notification);
    } else {
      this.notifyRole('staff', notification);
    }
  }

  notifyBatchComplete(batchId, batchNumber, operator) {
    const notification = {
      type: 'batch_complete',
      title: 'Batch Processing Complete',
      message: `Batch ${batchNumber} has been completed by ${operator}`,
      data: { batchId, batchNumber, operator },
      priority: 'high'
    };

    this.notifyRole('staff', notification);
  }

  notifyQualityControlAlert(message, batchId = null) {
    const notification = {
      type: 'quality_control_alert',
      title: 'Quality Control Alert',
      message,
      data: { batchId },
      priority: 'high'
    };

    this.notifyRole('staff', notification);
  }

  notifySystemAlert(message, priority = 'medium') {
    const notification = {
      type: 'system_alert',
      title: 'System Alert',
      message,
      priority
    };

    this.broadcastNotification(notification);
  }

  notifyReportGenerated(reportId, reportType, caseNumber, userId = null) {
    const notification = {
      type: 'report_generated',
      title: 'Report Generated',
      message: `${reportType} for case ${caseNumber} is ready for review`,
      data: { reportId, reportType, caseNumber },
      priority: 'medium'
    };

    if (userId) {
      this.notifyUser(userId, notification);
    } else {
      this.notifyRole('staff', notification);
    }
  }

  // Real-time updates
  broadcastSampleUpdate(sampleData) {
    if (this.io) {
      this.io.emit('sample_updated', {
        timestamp: new Date().toISOString(),
        sample: sampleData
      });
    }
  }

  broadcastBatchUpdate(batchData) {
    if (this.io) {
      this.io.emit('batch_updated', {
        timestamp: new Date().toISOString(),
        batch: batchData
      });
    }
  }

  // Connection status
  getConnectedClients() {
    return Array.from(this.connectedClients.values()).map(client => ({
      socketId: client.socket.id,
      userId: client.userId,
      role: client.role,
      username: client.username,
      connectedAt: client.connectedAt
    }));
  }

  getConnectionCount() {
    return this.connectedClients.size;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService;