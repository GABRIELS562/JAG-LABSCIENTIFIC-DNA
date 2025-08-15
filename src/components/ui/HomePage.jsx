import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Storage,
  Science,
  Assessment,
  Search,
  TableChart,
  ViewModule,
  Assignment,
  Group,
  Refresh,
  Speed,
  TrendingUp,
  People
} from '@mui/icons-material';
import api from '../../services/api';

const HomePage = ({ isDarkMode }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dbStats, setDbStats] = useState(null);
  const [sampleCounts, setSampleCounts] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Auto-refresh database on component mount
  useEffect(() => {
    refreshDatabase();
    fetchSampleCounts();
  }, []);

  const fetchSampleCounts = async () => {
    try {
      const response = await api.getSampleCounts();
      if (response.success) {
        setSampleCounts(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch sample counts:', error);
    }
  };

  const refreshDatabase = async () => {
    try {
      setRefreshing(true);
      const response = await api.refreshDatabase();
      if (response.success) {
        // Handle both wrapped and direct response formats
        const stats = response.data?.statistics || response.statistics;
        setDbStats(stats);
        setSnackbar({
          open: true,
          message: 'Database refreshed successfully',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to refresh database: ' + response.error,
          severity: 'error'
        });
      }
      // Also refresh sample counts
      await fetchSampleCounts();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error connecting to database',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const databaseButtons = [
    {
      title: 'Sample Management',
      description: 'View and manage all samples with batch tracking',
      icon: <Science />,
      color: '#0D488F',
      onClick: () => navigate('/client-register')
    },
    {
      title: 'PCR Batches',
      description: 'View PCR batch information and history',
      icon: <ViewModule />,
      color: '#022539',
      onClick: () => navigate('/pcr-batches')
    },
    {
      title: 'Electrophoresis Batches',
      description: 'View electrophoresis batch information',
      icon: <Assessment />,
      color: '#6BA23A',
      onClick: () => navigate('/electrophoresis-batches')
    },
    {
      title: 'Sample Queues',
      description: 'View sample workflow queues and status',
      icon: <TableChart />,
      color: '#8EC74F',
      onClick: () => navigate('/sample-queues')
    }
  ];

  const applicationButtons = [
    {
      title: 'Sample Management',
      description: 'Manage and track Peace of Mind samples',
      icon: <Assignment />,
      color: '#0D488F',
      onClick: () => navigate('/client-register')
    },
    {
      title: 'LDS PCR Plate',
      description: 'Design and manage LDS PCR plates',
      icon: <Science />,
      color: '#022539',
      onClick: () => navigate('/pcr-plate')
    },
    {
      title: 'Electrophoresis Layout',
      description: 'LAS Electrophoresis Batch Management',
      icon: <ViewModule />,
      color: '#6BA23A',
      onClick: () => navigate('/electrophoresis-layout')
    },
    {
      title: 'Sample Search',
      description: 'Search and filter samples',
      icon: <Search />,
      color: '#8EC74F',
      onClick: () => navigate('/sample-search')
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Database Status and Refresh */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            onClick={refreshDatabase}
            disabled={refreshing}
            size={isMobile ? 'large' : 'medium'}
            sx={{ 
              bgcolor: '#1e3a5f',
              '&:hover': { bgcolor: '#152a47' },
              minHeight: isMobile ? 48 : 'auto',
              px: isMobile ? 3 : 'auto'
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Database'}
          </Button>
        </Box>
        
        {sampleCounts && (
          <Grid container spacing={3} sx={{ justifyContent: 'center', maxWidth: 1000, mx: 'auto', mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                background: '#1e3a5f',
                color: 'white',
                borderRadius: 2, 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.95,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                },
                transition: 'all 0.3s ease'
              }} onClick={() => navigate('/client-register')}>
                <People sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {sampleCounts.total}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Samples
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                background: '#d97706',
                color: 'white',
                borderRadius: 2, 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.95,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                },
                transition: 'all 0.3s ease'
              }} onClick={() => navigate('/client-register')}>
                <Speed sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {sampleCounts.pending}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Pending Samples
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                background: '#3b82f6',
                color: 'white',
                borderRadius: 2, 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.95,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                },
                transition: 'all 0.3s ease'
              }} onClick={() => navigate('/pcr-plate')}>
                <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {sampleCounts.pcrBatched || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  PCR Batched
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                background: '#48a868',
                color: 'white',
                borderRadius: 2, 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.95,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                },
                transition: 'all 0.3s ease'
              }} onClick={() => navigate('/statistics')}>
                <Assessment sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {(sampleCounts.electroBatched || 0) + (sampleCounts.rerunBatched || 0)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  In Progress
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Laboratory Applications Section */}
      <Box sx={{ mb: 6 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 3, 
            textAlign: 'center', 
            color: isDarkMode ? 'white' : '#1e3a5f',
            fontWeight: 'bold'
          }}
        >
          Laboratory Applications
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {applicationButtons.map((button, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                  color: isDarkMode ? 'white' : 'inherit',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'white',
                    '& .icon-container': {
                      transform: 'scale(1.1)',
                      backgroundColor: button.color
                    }
                  }
                }}
                onClick={button.onClick}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box 
                    className="icon-container"
                    sx={{ 
                      mb: 2,
                      transition: 'all 0.3s ease',
                      display: 'inline-flex',
                      p: 2,
                      borderRadius: '50%',
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(30,58,95,0.1)'
                    }}
                  >
                    {React.cloneElement(button.icon, { 
                      sx: { fontSize: 28, color: button.color } 
                    })}
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      color: isDarkMode ? 'white' : '#1e3a5f' 
                    }}
                  >
                    {button.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      fontSize: '0.85rem'
                    }}
                  >
                    {button.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* System Information Section */}
      <Box sx={{ mb: 6 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 3, 
            textAlign: 'center',
            color: isDarkMode ? 'white' : '#1e3a5f',
            fontWeight: 'bold'
          }}
        >
          System Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              height: '100%',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
              borderLeft: '4px solid #1e3a5f'
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#1e3a5f', mb: 1 }}>
                  Laboratory Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ISO 17025 compliant LIMS for paternity testing and genetic analysis.
                  Integrated with GeneMapper ID for accurate STR analysis.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              height: '100%',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
              borderLeft: '4px solid #2d6987'
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#2d6987', mb: 1 }}>
                  Quality Assurance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete chain of custody tracking, audit trails, and quality control 
                  management for regulatory compliance.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              height: '100%',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
              borderLeft: '4px solid #48a868'
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#48a868', mb: 1 }}>
                  Workflow Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Streamlined sample processing from collection through analysis,
                  with automated batch management and report generation.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Database Access Section */}
      <Box>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 3, 
            textAlign: 'center', 
            color: isDarkMode ? 'white' : '#1e3a5f',
            fontWeight: 'bold'
          }}
        >
          Database Access
        </Typography>
        <Grid container spacing={3}>
          {databaseButtons.map((button, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                  color: isDarkMode ? 'white' : 'inherit',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'white',
                    '& .icon-container': {
                      transform: 'scale(1.1)',
                      backgroundColor: button.color
                    }
                  }
                }}
                onClick={button.onClick}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box 
                    className="icon-container"
                    sx={{ 
                      mb: 2,
                      transition: 'all 0.3s ease',
                      display: 'inline-flex',
                      p: 2,
                      borderRadius: '50%',
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(30,58,95,0.1)'
                    }}
                  >
                    {React.cloneElement(button.icon, { 
                      sx: { fontSize: 28, color: button.color } 
                    })}
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      color: isDarkMode ? 'white' : '#1e3a5f' 
                    }}
                  >
                    {button.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      fontSize: '0.85rem'
                    }}
                  >
                    {button.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HomePage;