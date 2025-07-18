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
  Chip
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
  Refresh
} from '@mui/icons-material';
import { api as optimizedApi } from '../../services/api';

const HomePage = ({ isDarkMode }) => {
  const navigate = useNavigate();
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
      const response = await optimizedApi.getSampleCounts();
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
      const response = await optimizedApi.refreshDatabase();
      if (response.success) {
        setDbStats(response.statistics);
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
      title: 'API Status',
      description: 'Check backend server status and health',
      icon: <Storage />,
      color: '#0D488F',
      onClick: () => window.open('http://localhost:3001/health', '_blank')
    },
    {
      title: 'Sample Management',
      description: 'View and manage all samples with batch tracking',
      icon: <Science />,
      color: '#8EC74F',
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
      color: '#0D488F',
      onClick: () => navigate('/sample-queues')
    }
  ];

  const applicationButtons = [
    {
      title: 'Register Client',
      description: 'Add new client and sample information',
      icon: <Group />,
      color: '#8EC74F',
      onClick: () => navigate('/register-client')
    },
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
            sx={{ 
              bgcolor: '#1e4976',
              '&:hover': { bgcolor: '#2c5a8e' }
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Database'}
          </Button>
        </Box>
        
        {sampleCounts && (
          <Grid container spacing={2} sx={{ justifyContent: 'center', maxWidth: 1000, mx: 'auto' }}>
            <Grid item xs={6} sm={12/5}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
                cursor: 'pointer',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                '&:hover': { 
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
                }
              }} onClick={() => navigate('/client-register')}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: isDarkMode ? 'white' : '#1a1a1a', 
                    mb: 0.5 
                  }}>
                    {sampleCounts.total}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                    fontWeight: 500 
                  }}>
                    📊 Total Samples
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={12/5}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
                cursor: 'pointer',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                borderLeft: '4px solid #ffa726',
                '&:hover': { 
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
                }
              }} onClick={() => navigate('/client-register')}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: isDarkMode ? 'white' : '#1a1a1a', 
                    mb: 0.5 
                  }}>
                    {sampleCounts.pending}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                    fontWeight: 500 
                  }}>
                    📋 Pending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={12/5}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
                cursor: 'pointer',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                borderLeft: '4px solid #42a5f5',
                '&:hover': { 
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
                }
              }} onClick={() => navigate('/client-register')}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: isDarkMode ? 'white' : '#1a1a1a', 
                    mb: 0.5 
                  }}>
                    {sampleCounts.pcrBatched}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                    fontWeight: 500 
                  }}>
                    🧬 PCR Batched
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={12/5}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
                cursor: 'pointer',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                borderLeft: '4px solid #ab47bc',
                '&:hover': { 
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
                }
              }} onClick={() => navigate('/client-register')}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: isDarkMode ? 'white' : '#1a1a1a', 
                    mb: 0.5 
                  }}>
                    {sampleCounts.electroBatched}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                    fontWeight: 500 
                  }}>
                    ⚡ Electro Batched
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={12/5}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
                cursor: 'pointer',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                borderLeft: '4px solid #ef5350',
                '&:hover': { 
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
                }
              }} onClick={() => navigate('/client-register')}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: isDarkMode ? 'white' : '#1a1a1a', 
                    mb: 0.5 
                  }}>
                    {sampleCounts.rerunBatched || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                    fontWeight: 500 
                  }}>
                    🔄 Rerun Batched
                  </Typography>
                </CardContent>
              </Card>
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
            color: isDarkMode ? 'white' : '#0D488F',
            fontWeight: 'bold'
          }}
        >
          🔬 Laboratory Applications
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
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(13,72,143,0.1)'
                    }}
                  >
                    {React.cloneElement(button.icon, { 
                      sx: { fontSize: 32, color: button.color } 
                    })}
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      color: isDarkMode ? 'white' : '#1e4976' 
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

      {/* DNA Video Background Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 3, 
            color: isDarkMode ? 'white' : '#0D488F',
            fontWeight: 'bold'
          }}
        >
          🧬 LabDNA Scientific
        </Typography>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            mb: 4,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backgroundColor: '#000',
            '& video': {
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              willChange: 'transform'
            }
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            style={{
              width: '100%',
              height: '600px',
              objectFit: 'contain',
              filter: isDarkMode ? 'brightness(0.8)' : 'none',
              transition: 'filter 0.3s ease-in-out'
            }}
          >
            <source src="/dna-smooth-loop.webm" type="video/webm" />
            <source src="/dna-smooth-loop.mp4" type="video/mp4" />
            {/* Fallback image for browsers that don't support video */}
            <img
              src="/dna-closely.jpg"
              alt="DNA Double Helix - Genetic Testing and Analysis"
              style={{
                width: '100%',
                height: '600px',
                objectFit: 'contain'
              }}
            />
          </video>
          {/* Overlay text for better readability */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              color: 'white',
              padding: 2,
              borderRadius: '8px',
              backdropFilter: 'blur(4px)'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                fontStyle: 'italic',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              Advanced DNA analysis and genetic testing for accurate paternity determination
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Database Access Section */}
      <Box>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 3, 
            textAlign: 'center', 
            color: isDarkMode ? 'white' : '#0D488F',
            fontWeight: 'bold'
          }}
        >
          🗄️ Database Access
        </Typography>
        <Grid container spacing={3}>
          {databaseButtons.map((button, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
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
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(13,72,143,0.1)'
                    }}
                  >
                    {React.cloneElement(button.icon, { 
                      sx: { fontSize: 32, color: button.color } 
                    })}
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      color: isDarkMode ? 'white' : '#1e4976' 
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