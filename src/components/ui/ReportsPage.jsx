import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Visibility as VisibilityIcon,
  Description as ReportIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const ReportsPage = () => {
  const { isDarkMode } = useThemeContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      // For now, we'll simulate fetching reports from different sources
      // In a real implementation, this would fetch from a unified reports API
      
      const mockReports = [
        {
          id: 1,
          fileName: 'PAT-2025-001_Paternity_Report.pdf',
          caseId: 'PAT-2025-001',
          reportType: 'Paternity Analysis',
          generatedDate: new Date().toISOString(),
          size: '2.4 MB',
          status: 'completed',
          downloadUrl: '/api/genetic-analysis/reports/download/PAT-2025-001_Paternity_Report.pdf'
        },
        {
          id: 2,
          fileName: 'PAT-2025-001_Certificate.pdf',
          caseId: 'PAT-2025-001',
          reportType: 'Certificate of Analysis',
          generatedDate: new Date(Date.now() - 3600000).toISOString(),
          size: '1.1 MB',
          status: 'completed',
          downloadUrl: '/api/genetic-analysis/reports/download/PAT-2025-001_Certificate.pdf'
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      setError('Failed to fetch reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      window.open(report.downloadUrl, '_blank');
    } catch (error) {
      setError('Failed to download report: ' + error.message);
    }
  };

  const handleViewReport = async (report) => {
    try {
      const newWindow = window.open(report.downloadUrl, '_blank');
      if (!newWindow) {
        // Fallback if popup is blocked
        window.location.href = report.downloadUrl;
      }
    } catch (error) {
      setError('Failed to view report: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#8EC74F';
      case 'failed': return '#ef5350';
      case 'generating': return '#ff9800';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
      case 'failed': return <ErrorIcon sx={{ color: '#ef5350' }} />;
      case 'generating': return <CircularProgress size={16} />;
      default: return <CheckCircleIcon sx={{ color: '#666' }} />;
    }
  };

  const getReportTypeColor = (type) => {
    switch (type) {
      case 'Paternity Analysis': return '#0D488F';
      case 'Certificate of Analysis': return '#8EC74F';
      case 'Quality Control': return '#ff9800';
      default: return '#666';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              color: isDarkMode ? 'white' : '#0D488F',
              fontWeight: 'bold',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            📄 Reports Management
            <Chip
              icon={<ReportIcon />}
              label={`${reports.length} Reports`}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
              mb: 1
            }}
          >
            Generated DNA Analysis Reports and Certificates
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAllReports}
          disabled={loading}
          sx={{
            borderColor: '#0D488F',
            color: '#0D488F',
            '&:hover': { 
              borderColor: '#022539',
              backgroundColor: 'rgba(13,72,143,0.1)'
            }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(13,72,143,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ReportIcon sx={{ fontSize: 40, color: '#0D488F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
                {reports.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(142,199,79,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#8EC74F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                {reports.filter(r => r.status === 'completed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(13,72,143,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: '#0D488F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
                {reports.filter(r => r.reportType === 'Paternity Analysis').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paternity Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(142,199,79,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#8EC74F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                {reports.filter(r => r.reportType === 'Certificate of Analysis').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Certificates
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Reports Table */}
      <Paper sx={{ 
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
        overflow: 'hidden'
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
            Generated Reports
          </Typography>
        </Box>
        
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Loading reports...</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: isDarkMode ? 'rgba(13,72,143,0.1)' : 'rgba(13,72,143,0.05)' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>File Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Report Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Generated</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow 
                    key={report.id}
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' 
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0D488F' }}>
                        {report.fileName}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {report.caseId}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={report.reportType}
                        size="small"
                        sx={{
                          backgroundColor: getReportTypeColor(report.reportType),
                          color: 'white'
                        }}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(report.generatedDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(report.generatedDate).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {report.size}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(report.status)}
                        <Chip
                          label={report.status}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(report.status),
                            color: 'white',
                            textTransform: 'capitalize'
                          }}
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Report">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewReport(report)}
                            sx={{ color: '#0D488F' }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Download Report">
                          <IconButton 
                            size="small"
                            onClick={() => handleDownloadReport(report)}
                            sx={{ color: '#8EC74F' }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {!loading && reports.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ReportIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Reports Generated
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Reports will appear here after generating analysis results
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ReportsPage;