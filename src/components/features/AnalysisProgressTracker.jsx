import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Button,
  Collapse
} from '@mui/material';
import {
  Science as ScienceIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const AnalysisProgressTracker = () => {
  const { isDarkMode } = useThemeContext();
  const [queueStatus, setQueueStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [hasRunningJobs, setHasRunningJobs] = useState(false);

  useEffect(() => {
    fetchQueueStatus();
  }, []);

  // Track if there are running jobs
  useEffect(() => {
    const runningCount = queueStatus.filter(item => item.status === 'running').length;
    setHasRunningJobs(runningCount > 0);
  }, [queueStatus]);

  // Disabled automatic polling to prevent flickering
  // TODO: Re-enable controlled polling later if needed
  // useEffect(() => {
  //   if (hasRunningJobs) {
  //     const interval = setInterval(fetchQueueStatus, 15000);
  //     return () => clearInterval(interval);
  //   }
  // }, [hasRunningJobs, fetchQueueStatus]);

  const fetchQueueStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/genetic-analysis/queue-status');
      const data = await response.json();
      
      if (data.success) {
        setQueueStatus(data.queue);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: '#ef5350' }} />;
      case 'running':
        return <PlayIcon sx={{ color: '#0D488F' }} />;
      case 'queued':
        return <ScheduleIcon sx={{ color: '#ff9800' }} />;
      default:
        return <ScheduleIcon sx={{ color: '#666' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#8EC74F';
      case 'failed': return '#ef5350';
      case 'running': return '#0D488F';
      case 'queued': return '#ff9800';
      default: return '#666';
    }
  };

  const getProgress = (item) => {
    switch (item.status) {
      case 'completed': return 100;
      case 'failed': return 0;
      case 'running': return 65; // Estimated progress
      case 'queued': return 0;
      default: return 0;
    }
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'Not started';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000); // seconds
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const retryAnalysis = useCallback(async (caseId) => {
    try {
      const response = await fetch(`/api/genetic-analysis/cases/${caseId}/analyze`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchQueueStatus(); // Refresh status
      }
    } catch (error) {
    }
  }, [fetchQueueStatus]);

  const queuedCount = queueStatus.filter(item => item.status === 'queued').length;
  const runningCount = queueStatus.filter(item => item.status === 'running').length;
  const completedCount = queueStatus.filter(item => item.status === 'completed').length;
  const failedCount = queueStatus.filter(item => item.status === 'failed').length;

  return (
    <Paper sx={{ 
      p: 3, 
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
      border: '1px solid rgba(13,72,143,0.1)'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScienceIcon sx={{ color: '#0D488F' }} />
          <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
            Osiris Analysis Queue
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={fetchQueueStatus}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
          <IconButton 
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Queue Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ 
            p: 1, 
            textAlign: 'center',
            backgroundColor: isDarkMode ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.05)',
            border: '1px solid rgba(255,152,0,0.2)'
          }}>
            <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
              {queuedCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Queued
            </Typography>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ 
            p: 1, 
            textAlign: 'center',
            backgroundColor: isDarkMode ? 'rgba(13,72,143,0.1)' : 'rgba(13,72,143,0.05)',
            border: '1px solid rgba(13,72,143,0.2)'
          }}>
            <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
              {runningCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Running
            </Typography>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ 
            p: 1, 
            textAlign: 'center',
            backgroundColor: isDarkMode ? 'rgba(142,199,79,0.1)' : 'rgba(142,199,79,0.05)',
            border: '1px solid rgba(142,199,79,0.2)'
          }}>
            <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
              {completedCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Completed
            </Typography>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ 
            p: 1, 
            textAlign: 'center',
            backgroundColor: isDarkMode ? 'rgba(239,83,80,0.1)' : 'rgba(239,83,80,0.05)',
            border: '1px solid rgba(239,83,80,0.2)'
          }}>
            <Typography variant="h4" sx={{ color: '#ef5350', fontWeight: 'bold' }}>
              {failedCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Failed
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Collapse in={expanded}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <LinearProgress sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Loading queue status...
            </Typography>
          </Box>
        ) : queueStatus.length > 0 ? (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {queueStatus.map((item, index) => (
              <ListItem 
                key={index}
                sx={{
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                }}
              >
                <ListItemIcon>
                  {getStatusIcon(item.status)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography component="span" variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {item.case_id}
                      </Typography>
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(item.status),
                          color: 'white'
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary">
                        Priority: {item.priority} | 
                        Duration: {formatDuration(item.started_date, item.completed_date)}
                      </Typography>
                      {item.error_message && (
                        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                          {item.error_message}
                        </Alert>
                      )}
                      {item.status === 'running' && (
                        <LinearProgress 
                          variant="determinate" 
                          value={getProgress(item)}
                          sx={{ mt: 1, borderRadius: 1 }}
                        />
                      )}
                    </>
                  }
                />
                
                <ListItemSecondaryAction>
                  {item.status === 'failed' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => retryAnalysis(item.case_id)}
                      sx={{ 
                        borderColor: '#8EC74F',
                        color: '#8EC74F',
                        '&:hover': { 
                          borderColor: '#6BA23A',
                          backgroundColor: 'rgba(142,199,79,0.1)'
                        }
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info">
            No analysis jobs in queue. Upload samples to start genetic analysis.
          </Alert>
        )}
      </Collapse>
    </Paper>
  );
};

export default AnalysisProgressTracker;