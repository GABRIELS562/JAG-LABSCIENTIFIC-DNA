import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  FilePresent as FileIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Send as SendIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchTypeFilter, setBatchTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    loadReports();
    loadStats();
  }, [page, batchTypeFilter, statusFilter, searchQuery]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        batch_type: batchTypeFilter,
        status: statusFilter,
        search: searchQuery
      });

      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data);
        setTotalPages(data.pagination.pages);
      } else {
        setError('Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/reports/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleView = async (report) => {
    try {
      // Open PDF in new tab
      window.open(`/api/reports/${report.id}/view`, '_blank');
    } catch (error) {
      console.error('Error viewing report:', error);
      setError('Error viewing report');
    }
  };

  const handleDownload = async (report) => {
    try {
      // Create download link
      const link = document.createElement('a');
      link.href = `/api/reports/${report.id}/download`;
      link.download = report.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Error downloading report');
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'sent':
        return <SendIcon color="primary" />;
      case 'archived':
        return <ArchiveIcon color="disabled" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'sent':
        return 'primary';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getBatchTypeColor = (batchType) => {
    switch (batchType.toLowerCase()) {
      case 'legal':
        return 'error';
      case 'peace_of_mind':
        return 'info';
      default:
        return 'default';
    }
  };

  const getBatchTypeLabel = (batchType) => {
    switch (batchType.toLowerCase()) {
      case 'legal':
        return 'Legal';
      case 'peace_of_mind':
        return 'Peace of Mind';
      default:
        return 'Standard';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          📊 Reports Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadReports();
            loadStats();
          }}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary">
                  {stats.total_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Reports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="error">
                  {stats.legal_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Legal
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main">
                  {stats.peace_of_mind_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Peace of Mind
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main">
                  {stats.completed_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main">
                  {stats.pending_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary">
                  {stats.sent_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sent
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Report number, batch number, filename..."
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Batch Type</InputLabel>
                <Select
                  value={batchTypeFilter}
                  onChange={(e) => setBatchTypeFilter(e.target.value)}
                  label="Batch Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="legal">Legal</MenuItem>
                  <MenuItem value="peace_of_mind">Peace of Mind</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                {reports.length} reports found
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report</TableCell>
                    <TableCell>Batch Type</TableCell>
                    <TableCell>Lab Batch</TableCell>
                    <TableCell>Filename</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>File</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {searchQuery || batchTypeFilter !== 'all' || statusFilter !== 'all'
                            ? 'No reports found matching your filters'
                            : 'No reports available'
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {report.report_number}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {report.report_type}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getBatchTypeLabel(report.batch_type)}
                            color={getBatchTypeColor(report.batch_type)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {report.lab_batch_number || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={report.original_filename}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                maxWidth: 200, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {report.original_filename}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(report.date_generated).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(report.status)}
                            <Chip
                              label={report.status}
                              color={getStatusColor(report.status)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {report.file_accessible ? (
                            <Tooltip title="File exists">
                              <FileIcon color="success" />
                            </Tooltip>
                          ) : (
                            <Tooltip title="File not found">
                              <ErrorIcon color="error" />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Report">
                              <IconButton
                                size="small"
                                onClick={() => handleView(report)}
                                disabled={!report.file_accessible}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Report">
                              <IconButton
                                size="small"
                                onClick={() => handleDownload(report)}
                                disabled={!report.file_accessible}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" p={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}