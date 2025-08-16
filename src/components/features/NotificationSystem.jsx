import React, { useState, useEffect, useRef } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
  Button,
  Divider,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkEmailReadIcon
} from '@mui/icons-material';
import webSocketService from '../../services/websocketService';

const NotificationSystem = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showToast, setShowToast] = useState(null);
  const notificationListeners = useRef([]);

  useEffect(() => {
    // Initialize WebSocket connection
    webSocketService.connect();

    // Load existing notifications
    setNotifications(webSocketService.getNotifications());
    setUnreadCount(webSocketService.getUnreadNotifications().length);
    setIsConnected(webSocketService.isSocketConnected());

    // Set up event listeners
    const unsubscribeConnection = webSocketService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubscribeNotification = webSocketService.on('notification', (notification) => {
      setNotifications(webSocketService.getNotifications());
      setUnreadCount(webSocketService.getUnreadNotifications().length);
      
      // Show toast notification
      setShowToast(notification);
    });

    const unsubscribeUpdate = webSocketService.on('notification_updated', () => {
      setNotifications(webSocketService.getNotifications());
      setUnreadCount(webSocketService.getUnreadNotifications().length);
    });

    const unsubscribeAllRead = webSocketService.on('all_notifications_read', () => {
      setNotifications(webSocketService.getNotifications());
      setUnreadCount(0);
    });

    const unsubscribeCleared = webSocketService.on('notifications_cleared', () => {
      setNotifications([]);
      setUnreadCount(0);
    });

    // Store listeners for cleanup
    notificationListeners.current = [
      unsubscribeConnection,
      unsubscribeNotification,
      unsubscribeUpdate,
      unsubscribeAllRead,
      unsubscribeCleared
    ];

    // Request notification permission
    webSocketService.requestNotificationPermission();

    return () => {
      // Cleanup listeners
      notificationListeners.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId) => {
    webSocketService.markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    webSocketService.markAllNotificationsAsRead();
  };

  const handleClearAll = () => {
    webSocketService.clearNotifications();
    handleClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'sample_status_update':
        return <InfoIcon color="info" fontSize="small" />;
      case 'batch_complete':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'quality_control_alert':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'system_alert':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'report_generated':
        return <CheckCircleIcon color="primary" fontSize="small" />;
      default:
        return <InfoIcon color="info" fontSize="small" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      {/* Notification Bell Icon */}
      <IconButton
        color="inherit"
        onClick={handleNotificationClick}
        aria-label={`${unreadCount} unread notifications`}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Connection Status Indicator */}
      {!isConnected && (
        <Chip
          size="small"
          label="Offline"
          color="error"
          variant="outlined"
          sx={{ ml: 1, fontSize: '0.7rem' }}
        />
      )}

      {/* Notifications Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Notifications
              {unreadCount > 0 && (
                <Chip
                  size="small"
                  label={unreadCount}
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <Box>
              {unreadCount > 0 && (
                <IconButton
                  size="small"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <MarkEmailReadIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={handleClearAll}
                title="Clear all"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Notifications List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List dense>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected'
                      }
                    }}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <Box sx={{ mr: 1, mt: 0.5 }}>
                      {getNotificationIcon(notification.type)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                            {notification.title}
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <Chip
                              size="small"
                              label={notification.priority}
                              color={getPriorityColor(notification.priority)}
                              sx={{ ml: 1, fontSize: '0.6rem', height: 16 }}
                            />
                            {!notification.read && (
                              <CircleIcon
                                sx={{ fontSize: 8, color: 'primary.main', ml: 0.5 }}
                              />
                            )}
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(notification.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              size="small"
              onClick={handleClose}
            >
              Close
            </Button>
          </Box>
        )}
      </Popover>

      {/* Toast Notification */}
      <Snackbar
        open={!!showToast}
        autoHideDuration={6000}
        onClose={() => setShowToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {showToast && (
          <Alert
            onClose={() => setShowToast(null)}
            severity={showToast.priority === 'high' ? 'error' : showToast.priority === 'medium' ? 'warning' : 'info'}
            variant="filled"
            sx={{ width: '100%' }}
          >
            <Typography variant="body2" fontWeight="bold">
              {showToast.title}
            </Typography>
            <Typography variant="body2">
              {showToast.message}
            </Typography>
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

export default NotificationSystem;