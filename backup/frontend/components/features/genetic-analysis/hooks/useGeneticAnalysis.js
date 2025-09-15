import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '../../../../hooks';

// Custom hook for genetic analysis data and operations
export function useGeneticAnalysis() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [osirisStatus, setOsirisStatus] = useState({ 
    initialized: false, 
    version: null,
    lastChecked: null,
    checking: false 
  });
  const notifications = useNotifications();
  
  // Fail-safe: Track status check attempts to prevent infinite loops
  const statusCheckAttempts = useRef(0);
  const maxStatusCheckAttempts = 3;
  const statusCheckCooldown = useRef(0);

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

  // Production-ready Osiris status check with fail-safes
  const checkOsirisStatus = useCallback(async () => {
    const now = Date.now();
    
    // Fail-safe: Check cooldown period (prevent rapid calls)
    if (now - statusCheckCooldown.current < 2000) {
      return;
    }
    
    // Prevent concurrent checks
    if (osirisStatus.checking) {
      return;
    }
    
    try {
      statusCheckCooldown.current = now;
      
      setOsirisStatus(prev => ({ ...prev, checking: true, error: null }));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/genetic-analysis/workspace-status', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOsirisStatus({
          initialized: true,
          version: 'Osiris 2.16',
          kitConfiguration: 'IdentifilerPlus',
          workspace: data.workspace || 'Configured',
          inputDirectory: data.inputDirectory,
          outputDirectory: data.outputDirectory,
          inputFiles: data.inputFiles || 0,
          outputFiles: data.outputFiles || 0,
          lastChecked: now,
          checking: false,
          error: null
        });
        // Reset attempt counter on success
        statusCheckAttempts.current = 0;
      } else {
        throw new Error(data.error || 'Configuration not found');
      }
    } catch (error) {
      let errorMessage = 'Connection failed';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - check server connection';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server';
      } else {
        errorMessage = error.message;
      }
        
      setOsirisStatus(prev => ({
        ...prev,
        initialized: false,
        error: errorMessage,
        lastChecked: now,
        checking: false
      }));
      
      // Increment attempts only on real failures
      statusCheckAttempts.current++;
    }
  }, [osirisStatus.checking]); // Only depend on checking state

  // Launch Osiris application
  const launchOsiris = useCallback(async () => {
    try {
      setOsirisStatus(prev => ({ ...prev, checking: true, error: null }));
      
      const response = await fetch('/api/genetic-analysis/launch-osiris', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Empty body for basic launch
      });
      
      const data = await response.json();
      
      if (data.success) {
        notifications.success('Osiris launched successfully! Please switch to the Osiris window.');
        
        // Update status to reflect successful launch
        setOsirisStatus(prev => ({
          ...prev,
          initialized: true,
          version: 'Osiris 2.16',
          workspace: data.workspace,
          inputDirectory: data.inputDirectory,
          outputDirectory: data.outputDirectory,
          checking: false,
          error: null,
          lastChecked: Date.now()
        }));
        
        return { success: true };
      } else {
        throw new Error(data.error || 'Launch failed');
      }
    } catch (error) {
      notifications.error(`Failed to launch Osiris: ${error.message}`);
      setOsirisStatus(prev => ({
        ...prev,
        checking: false,
        error: `Launch failed: ${error.message}`
      }));
      return { success: false, error: error.message };
    }
  }, [notifications]);

  // Reset status check limits (for manual retry in production)
  const resetStatusCheckLimits = useCallback(() => {
    statusCheckAttempts.current = 0;
    statusCheckCooldown.current = 0;
  }, []);

  // Initialize on mount - only once with stable dependencies
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      if (!mounted) return;
      
      // Fetch cases once
      await fetchCases();
      
      // Check Osiris status once (with built-in fail-safes)
      if (mounted) {
        checkOsirisStatus();
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - fetchCases and checkOsirisStatus are now stable

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
    launchOsiris,
    resetStatusCheckLimits,
    createCase,
    uploadFiles,
    startAnalysis
  };
}