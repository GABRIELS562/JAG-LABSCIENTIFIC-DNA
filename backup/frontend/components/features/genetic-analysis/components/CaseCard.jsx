import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Box
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  Upload as UploadIcon,
  People as FamilyIcon
} from '@mui/icons-material';
import { getStatusColor, getStatusIcon, getConclusionColor } from '../utils/statusHelpers';

const CaseCard = ({ 
  caseData, 
  onViewDetails, 
  onStartAnalysis, 
  onUploadFiles,
  isDarkMode = false 
}) => {
  const {
    id,
    caseId,
    caseType,
    status,
    priority,
    conclusion,
    paternityProbability,
    sampleCount,
    createdDate,
    notes
  } = caseData;

  const handleViewDetails = () => {
    onViewDetails(caseData);
  };

  const handleStartAnalysis = () => {
    onStartAnalysis(id);
  };

  const handleUploadFiles = () => {
    onUploadFiles(id);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef5350';
      case 'medium': return '#ff9800';
      case 'low': return '#66bb6a';
      default: return '#9e9e9e';
    }
  };

  return (
    <Card 
      elevation={2}
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDarkMode ? '0 8px 24px rgba(255,255,255,0.1)' : '0 8px 24px rgba(0,0,0,0.15)'
        },
        backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
        borderLeft: `4px solid ${getStatusColor(status)}`
      }}
    >
      <CardContent>
        {/* Header with Case ID and Priority */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" fontWeight="bold">
            {caseId}
          </Typography>
          <Chip
            label={priority?.toUpperCase() || 'NORMAL'}
            size="small"
            sx={{
              backgroundColor: getPriorityColor(priority),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>

        {/* Case Type and Sample Count */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {caseType?.replace('_', ' ').toUpperCase() || 'PATERNITY'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <FamilyIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Samples
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {sampleCount || 0}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Status and Conclusion */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" mb={1}>
              {getStatusIcon(status)}
              <Typography variant="body2" color="text.secondary" ml={1}>
                Status
              </Typography>
            </Box>
            <Chip
              label={status?.replace('_', ' ').toUpperCase() || 'PENDING'}
              size="small"
              sx={{
                backgroundColor: getStatusColor(status),
                color: 'white'
              }}
            />
          </Grid>
          <Grid item xs={6}>
            {conclusion && (
              <>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Conclusion
                </Typography>
                <Chip
                  label={conclusion.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getConclusionColor(conclusion),
                    color: 'white'
                  }}
                />
              </>
            )}
          </Grid>
        </Grid>

        {/* Paternity Probability */}
        {paternityProbability && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Paternity Probability
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {(paternityProbability * 100).toFixed(2)}%
            </Typography>
          </Box>
        )}

        {/* Notes */}
        {notes && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Notes
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                maxHeight: '40px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {notes}
            </Typography>
          </Box>
        )}

        {/* Created Date */}
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Created: {new Date(createdDate).toLocaleDateString()}
        </Typography>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Tooltip title="View Details">
              <IconButton 
                onClick={handleViewDetails}
                size="small"
                sx={{ color: 'primary.main' }}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            
            {status !== 'completed' && status !== 'analysis_complete' && (
              <Tooltip title="Upload Files">
                <IconButton 
                  onClick={handleUploadFiles}
                  size="small"
                  sx={{ color: 'info.main' }}
                >
                  <UploadIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {status === 'pending' && sampleCount > 0 && (
            <Tooltip title="Start Analysis">
              <IconButton 
                onClick={handleStartAnalysis}
                size="small"
                sx={{ 
                  backgroundColor: 'success.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'success.dark'
                  }
                }}
              >
                <AssessmentIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CaseCard;