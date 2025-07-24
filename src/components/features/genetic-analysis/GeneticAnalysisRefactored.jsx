import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Paper,
  Typography
} from '@mui/material';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { useModal } from '../../../hooks';
import { useGeneticAnalysis } from './hooks/useGeneticAnalysis';

// Import child components
import OsirisStatusCard from './components/OsirisStatusCard';
import OsirisInfoPanel from './components/OsirisInfoPanel';
import CasesList from './components/CasesList';
import NewCaseDialog from '../dialogs/NewCaseDialog';
import FileUploadDialog from '../dialogs/FileUploadDialog';
import CaseDetailsDialog from '../dialogs/CaseDetailsDialog';
import AnalysisProgressTracker from '../AnalysisProgressTracker';
import GeneMapperTab from './components/GeneMapperTab';

const GeneticAnalysisRefactored = () => {
  const { isDarkMode } = useThemeContext();
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
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
    resetStatusCheckLimits,
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

  const handleLaunchOsiris = useCallback(() => {
    checkOsirisStatus();
  }, [checkOsirisStatus]);

  // Handle tab change
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

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
        {/* Software Selection Tabs */}
        <Grid item xs={12}>
          <Paper sx={{ mb: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                centered
                sx={{
                  '& .MuiTab-root': {
                    minWidth: 200,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }
                }}
              >
                <Tab 
                  label="Osiris Software" 
                  id="tab-0"
                  aria-controls="tabpanel-0"
                />
                <Tab 
                  label="GeneMapper Software" 
                  id="tab-1"
                  aria-controls="tabpanel-1"
                />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ p: 3 }}>
              {/* Osiris Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Osiris Genetic Analysis Software
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Upload .fsa files for processing with Osiris. Results will be automatically parsed and displayed on the Analysis Summary page.
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {/* Osiris Status Card */}
                    <Grid item xs={12}>
                      <OsirisStatusCard
                        osirisStatus={osirisStatus}
                        onCheckStatus={checkOsirisStatus}
                        onLaunchOsiris={handleLaunchOsiris}
                        onResetLimits={resetStatusCheckLimits}
                        isDarkMode={isDarkMode}
                      />
                    </Grid>

                    {/* File Upload Section */}
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Upload Custom .fsa Files
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          Upload your own .fsa files from genetic analyzers for processing. Files will be automatically processed and results displayed on the Analysis Summary page.
                        </Typography>
                        
                        <Paper 
                          sx={{ 
                            p: 3, 
                            border: '2px dashed', 
                            borderColor: 'primary.main',
                            backgroundColor: isDarkMode ? 'grey.900' : 'grey.50',
                            textAlign: 'center'
                          }}
                        >
                          <input
                            type="file"
                            multiple
                            accept=".fsa"
                            onChange={async (e) => {
                              const files = Array.from(e.target.files);
                              if (files.length > 0) {
                                notifications.addNotification({
                                  type: 'info',
                                  message: `Uploading ${files.length} .fsa file(s) for processing...`
                                });
                                
                                try {
                                  // Create a temporary case first
                                  const caseData = {
                                    case_name: `Custom FSA Upload ${new Date().toLocaleString()}`,
                                    case_type: 'paternity',
                                    description: 'Custom .fsa file upload for analysis'
                                  };
                                  
                                  const caseResult = await createCase(caseData);
                                  if (caseResult.success) {
                                    // Upload files to the new case
                                    const uploadResult = await uploadFiles(caseResult.data.case_id, files);
                                    if (uploadResult.success) {
                                      notifications.addNotification({
                                        type: 'success',
                                        message: `Successfully processed ${files.length} .fsa file(s). Check Analysis Summary for results.`
                                      });
                                    } else {
                                      notifications.addNotification({
                                        type: 'error',
                                        message: `Failed to upload files: ${uploadResult.error}`
                                      });
                                    }
                                  } else {
                                    notifications.addNotification({
                                      type: 'error',
                                      message: `Failed to create case: ${caseResult.error}`
                                    });
                                  }
                                } catch (error) {
                                  notifications.addNotification({
                                    type: 'error',
                                    message: `Upload failed: ${error.message}`
                                  });
                                }
                                
                                // Clear the file input
                                e.target.value = '';
                              }
                            }}
                            style={{ display: 'none' }}
                            id="fsa-file-upload"
                          />
                          <label htmlFor="fsa-file-upload">
                            <Box 
                              component="span" 
                              sx={{ 
                                display: 'inline-block',
                                padding: 2,
                                border: '2px solid',
                                borderColor: 'primary.main',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'primary.light',
                                  color: 'primary.contrastText'
                                }
                              }}
                            >
                              <Typography variant="button">
                                Click to Select .fsa Files
                              </Typography>
                            </Box>
                          </label>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Supports: Applied Biosystems 3130xl, 3500xL genetic analyzer files
                          </Typography>
                        </Paper>
                      </Box>
                    </Grid>

                    {/* Osiris Information Panel */}
                    <Grid item xs={12}>
                      <OsirisInfoPanel
                        workspaceStatus={osirisStatus}
                        onRefresh={checkOsirisStatus}
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
                </Box>
              )}

              {/* GeneMapper Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    GeneMapper Software Analysis
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Upload .fsa files from Applied Biosystems 3130xl/3500 genetic analyzers. Process files manually through GeneMapper software and import results.
                  </Typography>
                  
                  <GeneMapperTab
                    isDarkMode={isDarkMode}
                    notifications={notifications}
                  />
                </Box>
              )}
            </Box>
          </Paper>
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