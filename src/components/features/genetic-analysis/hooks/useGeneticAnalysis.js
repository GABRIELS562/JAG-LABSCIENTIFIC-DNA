import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../../../hooks';

// Custom hook for genetic analysis data and operations (GeneMapper workflow)
export function useGeneticAnalysis() {
  const [selectedCase, setSelectedCase] = useState(null);
  const notifications = useNotifications();

  // Manual state management for cases to avoid useApiData dependency issues
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState(null);

  // Manual fetch cases function with stable reference
  const fetchCases = useCallback(async () => {
    try {
      setCasesLoading(true);
      setCasesError(null);
      
      const response = await fetch('/api/genetic-analysis/cases');
      const data = await response.json();
      
      if (data.success) {
        setCases(data.data || []);
      } else {
        setCasesError(data.error || 'Failed to fetch cases');
      }
    } catch (error) {
      setCasesError(error.message);
    } finally {
      setCasesLoading(false);
    }
  }, []); // No dependencies to ensure stable reference

  // Removed Osiris status check and launch functions

  // Initialize on mount - simplified for GeneMapper workflow
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      if (!mounted) return;
      
      // Fetch cases once
      await fetchCases();
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - fetchCases is stable

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
    
    // Loading states
    casesLoading,
    casesError,
    
    // Notifications
    notifications,
    
    // Actions
    setSelectedCase,
    fetchCases,
    createCase,
    uploadFiles,
    startAnalysis
  };
}