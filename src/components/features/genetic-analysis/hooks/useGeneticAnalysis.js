import { useState, useEffect, useCallback } from 'react';
import { useApiData, useNotifications } from '../../../hooks';

// Custom hook for genetic analysis data and operations
export function useGeneticAnalysis() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [osirisStatus, setOsirisStatus] = useState({ initialized: false, version: null });
  const notifications = useNotifications();

  // Fetch cases using the shared API hook
  const {
    data: cases = [],
    loading: casesLoading,
    error: casesError,
    refetch: fetchCases
  } = useApiData(
    () => fetch('/api/genetic-analysis/cases').then(res => res.json()),
    [],
    {
      initialData: [],
      onError: (error) => notifications.error(`Failed to load cases: ${error}`)
    }
  );

  // Check Osiris status
  const checkOsirisStatus = useCallback(async () => {
    try {
      notifications.info('🔄 Checking Osiris status...', { duration: 2000 });
      
      const response = await fetch('/api/genetic-analysis/initialize-osiris', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setOsirisStatus({
          initialized: true,
          version: data.osirisVersion,
          kitConfiguration: data.kitConfiguration
        });
        notifications.success('✅ Osiris launched successfully!');
      } else {
        notifications.error(`❌ Failed to launch Osiris: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setOsirisStatus({ initialized: false, error: error.message });
      notifications.error('❌ Network error launching Osiris');
    }
  }, [notifications]);

  // Initialize on mount
  useEffect(() => {
    checkOsirisStatus();
  }, [checkOsirisStatus]);

  // Create new case
  const createCase = useCallback(async (caseData) => {
    try {
      const response = await fetch('/api/genetic-analysis/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(caseData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        notifications.success('Case created successfully');
        fetchCases(); // Refresh cases list
        return { success: true, data: data.case };
      } else {
        notifications.error(`Failed to create case: ${data.error}`);
        return { success: false, error: data.error };
      }
    } catch (error) {
      notifications.error('Network error creating case');
      return { success: false, error: error.message };
    }
  }, [notifications, fetchCases]);

  // Upload files for a case
  const uploadFiles = useCallback(async (caseId, files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('caseId', caseId);

      const response = await fetch('/api/genetic-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        notifications.success('Files uploaded successfully');
        fetchCases(); // Refresh to show updated case
        return { success: true };
      } else {
        notifications.error(`Upload failed: ${data.error}`);
        return { success: false, error: data.error };
      }
    } catch (error) {
      notifications.error('Network error during upload');
      return { success: false, error: error.message };
    }
  }, [notifications, fetchCases]);

  // Start analysis for a case
  const startAnalysis = useCallback(async (caseId) => {
    try {
      const response = await fetch(`/api/genetic-analysis/analyze/${caseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        notifications.success('Analysis started successfully');
        fetchCases(); // Refresh to show updated status
        return { success: true };
      } else {
        notifications.error(`Failed to start analysis: ${data.error}`);
        return { success: false, error: data.error };
      }
    } catch (error) {
      notifications.error('Network error starting analysis');
      return { success: false, error: error.message };
    }
  }, [notifications, fetchCases]);

  return {
    // Data
    cases,
    selectedCase,
    osirisStatus,
    
    // Loading states
    casesLoading,
    casesError,
    
    // Notifications
    notifications,
    
    // Actions
    setSelectedCase,
    fetchCases,
    checkOsirisStatus,
    createCase,
    uploadFiles,
    startAnalysis
  };
}