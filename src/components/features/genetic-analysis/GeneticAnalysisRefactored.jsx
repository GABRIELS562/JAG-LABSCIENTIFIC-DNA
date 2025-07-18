import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Snackbar,
  Alert
} from '@mui/material';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { useModal } from '../../../hooks';
import { useGeneticAnalysis } from './hooks/useGeneticAnalysis';

// Import child components
import OsirisStatusCard from './components/OsirisStatusCard';
import CasesList from './components/CasesList';
import NewCaseDialog from '../dialogs/NewCaseDialog';
import FileUploadDialog from '../dialogs/FileUploadDialog';
import CaseDetailsDialog from '../dialogs/CaseDetailsDialog';
import AnalysisProgressTracker from '../AnalysisProgressTracker';

const GeneticAnalysisRefactored = () => {
  const { isDarkMode } = useThemeContext();
  
  // Use custom hooks for state management
  const {
    cases,
    selectedCase,
    osirisStatus,
    casesLoading,
    casesError,
    notifications,
    setSelectedCase,
    fetchCases,
    checkOsirisStatus,
    createCase,
    uploadFiles,
    startAnalysis
  } = useGeneticAnalysis();

  // Modal state management
  const newCaseModal = useModal();
  const uploadModal = useModal();
  const detailsModal = useModal();

  // Handle case creation
  const handleCreateCase = async (caseData) => {
    const result = await createCase(caseData);
    if (result.success) {
      newCaseModal.close();
    }
    return result;
  };

  // Handle file uploads
  const handleUploadFiles = async (files) => {
    if (!uploadModal.data) return;
    
    const result = await uploadFiles(uploadModal.data, files);
    if (result.success) {
      uploadModal.close();
    }
    return result;
  };

  // Handle starting analysis
  const handleStartAnalysis = async (caseId) => {
    const result = await startAnalysis(caseId);
    return result;
  };

  // Handle case actions
  const handleViewDetails = (caseData) => {
    setSelectedCase(caseData);
    detailsModal.open(caseData);
  };

  const handleUploadForCase = (caseId) => {
    uploadModal.open(caseId);
  };

  const handleLaunchOsiris = () => {
    checkOsirisStatus();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Grid container spacing={3}>
        {/* Osiris Status Card */}
        <Grid item xs={12}>
          <OsirisStatusCard
            osirisStatus={osirisStatus}
            onCheckStatus={checkOsirisStatus}
            onLaunchOsiris={handleLaunchOsiris}
            isDarkMode={isDarkMode}
          />
        </Grid>

        {/* Analysis Progress Tracker */}
        {selectedCase && (
          <Grid item xs={12}>
            <AnalysisProgressTracker caseData={selectedCase} />
          </Grid>
        )}

        {/* Cases List */}
        <Grid item xs={12}>
          <CasesList
            cases={cases}
            loading={casesLoading}
            error={casesError}
            onNewCase={newCaseModal.open}
            onRefresh={fetchCases}
            onViewDetails={handleViewDetails}
            onStartAnalysis={handleStartAnalysis}
            onUploadFiles={handleUploadForCase}
            isDarkMode={isDarkMode}
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
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
          onClose={() => notifications.removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => notifications.removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Container>
  );
};

export default GeneticAnalysisRefactored;