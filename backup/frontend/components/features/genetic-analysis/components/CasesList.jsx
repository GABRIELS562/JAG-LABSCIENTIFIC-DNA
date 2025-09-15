import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import CaseCard from './CaseCard';

const CasesList = ({
  cases = [],
  loading = false,
  error = null,
  onNewCase,
  onRefresh,
  onViewDetails,
  onStartAnalysis,
  onUploadFiles,
  isDarkMode = false
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <CircularProgress />
        <Typography variant="body1" ml={2}>
          Loading cases...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button
            color="inherit"
            size="small"
            onClick={onRefresh}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Genetic Analysis Cases
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            size="small"
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNewCase}
            color="primary"
          >
            New Case
          </Button>
        </Box>
      </Box>

      {/* Cases Grid */}
      {cases.length === 0 ? (
        <Box 
          textAlign="center" 
          py={8}
          sx={{
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderRadius: 2,
            border: isDarkMode ? '1px dashed rgba(255,255,255,0.3)' : '1px dashed rgba(0,0,0,0.3)'
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Cases Found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Start by creating your first genetic analysis case.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNewCase}
            color="primary"
          >
            Create First Case
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {cases.map((caseData) => (
            <Grid item xs={12} sm={6} md={4} key={caseData.id}>
              <CaseCard
                caseData={caseData}
                onViewDetails={onViewDetails}
                onStartAnalysis={onStartAnalysis}
                onUploadFiles={onUploadFiles}
                isDarkMode={isDarkMode}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Summary */}
      {cases.length > 0 && (
        <Box mt={4} p={2} sx={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {cases.length} case{cases.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CasesList;