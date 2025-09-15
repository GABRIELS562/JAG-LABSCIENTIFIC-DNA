import React, { useState, useEffect } from 'react';
import { Alert, Chip, Tooltip, Box, IconButton, Collapse } from '@mui/material';
import {
  Wifi,
  WifiOff,
  CloudDone,
  CloudOff,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  Storage,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { api } from '../../services/api';

const ConnectionStatus = () => {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isHealthy: null,
    showDetails: false
  });

  const [connectionDetails, setConnectionDetails] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribe = api.onConnectionChange((connectionStatus) => {
      setStatus(prevStatus => ({
        ...prevStatus,
        isOnline: connectionStatus.isOnline,
        isHealthy: connectionStatus.isHealthy
      }));

      // Update connection details
      setConnectionDetails(api.getConnectionStatus());
    });

    // Initial status check
    setConnectionDetails(api.getConnectionStatus());

    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.checkHealth();
      setConnectionDetails(api.getConnectionStatus());
    } catch (error) {
      console.warn('Manual health check failed:', error);
    }
    setIsRefreshing(false);
  };

  const toggleDetails = () => {
    setStatus(prev => ({ ...prev, showDetails: !prev.showDetails }));
  };

  const getStatusInfo = () => {
    if (!status.isOnline) {
      return {
        color: 'error',
        icon: <WifiOff />,
        text: 'Offline',
        severity: 'error',
        message: 'No internet connection detected. Working in offline mode.'
      };
    }

    if (status.isHealthy === null) {
      return {
        color: 'warning',
        icon: <Warning />,
        text: 'Checking...',
        severity: 'info',
        message: 'Checking server connection...'
      };
    }

    if (status.isHealthy === false) {
      return {
        color: 'error',
        icon: <CloudOff />,
        text: 'Server Unavailable',
        severity: 'error',
        message: 'Cannot connect to LIMS server. Using cached data when available.'
      };
    }

    return {
      color: 'success',
      icon: <CheckCircle />,
      text: 'Connected',
      severity: 'success',
      message: 'Connected to LIMS server'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, maxWidth: 400 }}>
      <Chip
        icon={statusInfo.icon}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {statusInfo.text}
            <IconButton
              size="small"
              onClick={toggleDetails}
              sx={{ color: 'inherit', p: 0.25 }}
            >
              {status.showDetails ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        }
        color={statusInfo.color}
        variant={status.isOnline && status.isHealthy ? "filled" : "outlined"}
        clickable
        onClick={toggleDetails}
        sx={{
          fontSize: '0.875rem',
          height: 32,
          '& .MuiChip-label': {
            px: 1
          }
        }}
      />

      <Collapse in={status.showDetails} timeout="auto" unmountOnExit>
        <Alert
          severity={statusInfo.severity}
          sx={{ mt: 1, borderRadius: 2 }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {connectionDetails?.hasOfflineData && (
                <Tooltip title="Offline data available">
                  <Storage fontSize="small" />
                </Tooltip>
              )}
              <Tooltip title="Refresh connection">
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  sx={{ color: 'inherit' }}
                >
                  <Refresh
                    fontSize="small"
                    sx={{
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Box>
          }
        >
          <Box>
            <Box sx={{ fontSize: '0.875rem', mb: 1 }}>
              {statusInfo.message}
            </Box>

            {connectionDetails && (
              <Box sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                <Box>Server: {connectionDetails.baseURL}</Box>
                <Box>Cache: {connectionDetails.cacheSize} items</Box>
                {connectionDetails.lastHealthCheck > 0 && (
                  <Box>
                    Last check: {new Date(connectionDetails.lastHealthCheck).toLocaleTimeString()}
                  </Box>
                )}
                {connectionDetails.hasOfflineData && (
                  <Box sx={{ color: 'success.main', fontWeight: 'medium' }}>
                    ✓ Offline data available
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Alert>
      </Collapse>
    </Box>
  );
};

export default ConnectionStatus;