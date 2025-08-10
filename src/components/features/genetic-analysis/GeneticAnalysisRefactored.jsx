import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Snackbar,
  Alert,
  Paper,
  Typography
} from '@mui/material';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { useModal } from '../../../hooks';
import { useGeneticAnalysis } from './hooks/useGeneticAnalysis';

// Import child components  
import CasesList from './components/CasesList';
import NewCaseDialog from '../dialogs/NewCaseDialog';
import FileUploadDialog from '../dialogs/FileUploadDialog';
import CaseDetailsDialog from '../dialogs/CaseDetailsDialog';
import AnalysisProgressTracker from '../AnalysisProgressTracker';
import GeneMapperTab from './components/GeneMapperTab';

const GeneticAnalysisRefactored = () => {
  const { isDarkMode } = useThemeContext();
  
  // Tab state removed - now using GeneMapper as primary workflow
  
  // Use custom hooks for state management (Osiris removed)
  const {
    cases,
    selectedCase,
    casesLoading,
    casesError,
    notifications,
    setSelectedCase,
    fetchCases,
    createCase,
    uploadFiles,
    startAnalysis
  } = useGeneticAnalysis();

  // Modal state management
  const newCaseModal = useModal();
  const uploadModal = useModal();
  const detailsModal = useModal();

  // Handle case creation - memoized
  const handleCreateCase = useCallback(async (caseData) => {
    const result = await createCase(caseData);
    if (result.success) {
      newCaseModal.close();
    }
    return result;
  }, [createCase, newCaseModal]);

  // Handle file uploads - memoized
  const handleUploadFiles = useCallback(async (files) => {
    if (!uploadModal.data) return;
    
    const result = await uploadFiles(uploadModal.data, files);
    if (result.success) {
      uploadModal.close();
    }
    return result;
  }, [uploadFiles, uploadModal]);

  // Handle starting analysis - memoized
  const handleStartAnalysis = useCallback(async (caseId) => {
    const result = await startAnalysis(caseId);
    return result;
  }, [startAnalysis]);

  // Handle case actions - memoized
  const handleViewDetails = useCallback((caseData) => {
    setSelectedCase(caseData);
    detailsModal.open(caseData);
  }, [setSelectedCase, detailsModal]);

  const handleUploadForCase = useCallback((caseId) => {
    uploadModal.open(caseId);
  }, [uploadModal]);

  // Removed Osiris launch function

  // Tab change handler removed

  // Memoized notification close handler
  const handleNotificationClose = useCallback((notificationId) => {
    notifications.removeNotification(notificationId);
  }, [notifications]);

  // Memoized notification component
  const NotificationItem = useCallback(({ notification }) => (
    <Snackbar
      key={notification.id}
      open={true}
      autoHideDuration={notification.duration}
      onClose={() => handleNotificationClose(notification.id)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={() => handleNotificationClose(notification.id)}
        severity={notification.type}
        variant="filled"
      >
        {notification.message}
      </Alert>
    </Snackbar>
  ), [handleNotificationClose]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Paper sx={{ mb: 2, p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🧬 Genetic Analysis Setup
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Upload and process .fsa files from your Applied Biosystems genetic analyzers using GeneMapper workflow.
              Results will be automatically analyzed and displayed on the Analysis Summary page.
            </Typography>
          </Paper>
        </Grid>

        {/* GeneMapper Content - Now the primary workflow */}
        <Grid item xs={12}>
          <GeneMapperTab
            isDarkMode={isDarkMode}
            notifications={notifications}
          />
        </Grid>
      </Grid>

      {/* Dialogs */}
      <NewCaseDialog
        open={newCaseModal.isOpen}
        onClose={newCaseModal.close}
        onSubmit={handleCreateCase}
      />

      <FileUploadDialog
        open={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUpload={handleUploadFiles}
        caseId={uploadModal.data}
      />

      <CaseDetailsDialog
        open={detailsModal.isOpen}
        onClose={detailsModal.close}
        caseData={detailsModal.data}
      />

      {/* Notifications */}
      {notifications.notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </Container>
  );
};

export default GeneticAnalysisRefactored;