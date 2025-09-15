import React from 'react';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// Utility functions for status handling
export const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
    case 'analysis_complete':
      return '#8EC74F';
    case 'in_progress':
      return '#0D488F';
    case 'failed':
      return '#ef5350';
    case 'pending':
      return '#ff9800';
    default:
      return '#666';
  }
};

export const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
    case 'analysis_complete':
      return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
    case 'failed':
      return <ErrorIcon sx={{ color: '#ef5350' }} />;
    case 'in_progress':
      return <ScheduleIcon sx={{ color: '#0D488F' }} />;
    default:
      return <ScheduleIcon sx={{ color: '#ff9800' }} />;
  }
};

export const getConclusionColor = (conclusion) => {
  switch (conclusion) {
    case 'inclusion':
      return '#8EC74F';
    case 'exclusion':
      return '#ef5350';
    case 'inconclusive':
      return '#ff9800';
    default:
      return '#666';
  }
};

export const getConclusionIcon = (conclusion) => {
  switch (conclusion) {
    case 'inclusion':
      return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
    case 'exclusion':
      return <ErrorIcon sx={{ color: '#ef5350' }} />;
    case 'inconclusive':
      return <WarningIcon sx={{ color: '#ff9800' }} />;
    default:
      return <ScheduleIcon sx={{ color: '#666' }} />;
  }
};

export const getStatusText = (status) => {
  switch (status) {
    case 'completed':
    case 'analysis_complete':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
    default:
      return 'Unknown';
  }
};

export const getConclusionText = (conclusion) => {
  switch (conclusion) {
    case 'inclusion':
      return 'Inclusion';
    case 'exclusion':
      return 'Exclusion';
    case 'inconclusive':
      return 'Inconclusive';
    default:
      return 'Pending';
  }
};