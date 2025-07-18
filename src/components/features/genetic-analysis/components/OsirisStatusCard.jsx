import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Science as ScienceIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';

const OsirisStatusCard = ({ 
  osirisStatus, 
  onCheckStatus, 
  onLaunchOsiris,
  isDarkMode = false 
}) => {
  const { initialized, version, kitConfiguration, error } = osirisStatus;

  const getStatusColor = () => {
    if (error) return 'error';
    if (initialized) return 'success';
    return 'warning';
  };

  const getStatusIcon = () => {
    if (error) return <ErrorIcon />;
    if (initialized) return <CheckCircleIcon />;
    return <ScienceIcon />;
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (initialized) return 'Connected';
    return 'Disconnected';
  };

  return (
    <Card 
      elevation={2}
      sx={{ 
        backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
        border: `2px solid ${
          error ? '#ef5350' : 
          initialized ? '#4caf50' : 
          '#ff9800'
        }`
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <ScienceIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Osiris STR Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Genetic Analysis Software
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            variant="filled"
          />
        </Box>

        {/* Status Details */}
        {initialized && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Connection Details:
            </Typography>
            <Box ml={2}>
              {version && (
                <Typography variant="body2">
                  <strong>Version:</strong> {version}
                </Typography>
              )}
              {kitConfiguration && (
                <Typography variant="body2">
                  <strong>Kit Configuration:</strong> {kitConfiguration}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Status:</strong> Ready for analysis
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Connection Error:</strong> {error}
            </Typography>
          </Alert>
        )}

        {/* Not Connected Message */}
        {!initialized && !error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Osiris is not connected. Please ensure the software is installed and running.
            </Typography>
          </Alert>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onCheckStatus}
            size="small"
          >
            Check Status
          </Button>
          
          {!initialized && (
            <Button
              variant="contained"
              startIcon={<LaunchIcon />}
              onClick={onLaunchOsiris}
              size="small"
              color="primary"
            >
              Launch Osiris
            </Button>
          )}
          
          {initialized && (
            <Button
              variant="contained"
              startIcon={<ScienceIcon />}
              size="small"
              color="success"
              disabled
            >
              Ready for Analysis
            </Button>
          )}
        </Box>

        {/* Help Text */}
        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          Osiris STR Analysis software is required for genetic analysis. 
          Ensure it's installed and properly configured before starting analysis.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OsirisStatusCard;