import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import all route components
import HomePage from '../ui/HomePage';
import IntegratedHomePage from '../ui/IntegratedHomePage';
import Reports from '../features/Reports';
import LabResults from '../features/LabResults';
import ElectrophoresisBatches from '../features/ElectrophoresisBatches';
import RerunBatches from '../features/RerunBatches';
import SampleManagement from '../features/SampleManagement';
import QualityControlModule from '../features/QualityControlModule';
import PCRPlate from '../features/PCRPlate';
import PCRBatches from '../features/PCRBatches';
import SampleSearch from '../features/SampleSearch';
import GeneticAnalysis from '../features/genetic-analysis/GeneticAnalysisRefactored';
import AnalysisSummary from '../features/AnalysisSummary';
import ElectrophoresisLayout from '../features/ElectrophoresisLayout';
import Reruns from '../features/Reruns';
import ApiTest from '../debug/ApiTest';
import PaternityTestForm from '../forms/PaternityTestForm';
import ISO17025Dashboard from '../features/ISO17025Dashboard';
import TestRoute from '../TestRoute';
import DebugRouter from '../DebugRouter';
import BatchCompletion from '../features/BatchCompletion';
import GeneMapperImport from '../features/GeneMapperImport';

// Import authentication components
import LoginPage from '../auth/LoginPage';
import ProtectedRoute, { StaffOnlyRoute } from '../auth/ProtectedRoute';

// Import enhanced components
import ErrorBoundary from '../common/ErrorBoundary';
import { LoadingState } from '../common/LoadingSystem';
import { useThemeContext } from '../../contexts/ThemeContext';

/**
 * Main application routes with enhanced error handling and loading states
 */
function AppRoutes() {
  const { isDarkMode } = useThemeContext();

  const mainBackground = isDarkMode
    ? 'bg-gradient-to-br from-[#022539] to-[#032539]'
    : 'bg-gradient-to-br from-[#DBF1FC] to-[#F5F5F5]';

  const containerBackground = isDarkMode
    ? 'bg-[#0a1b2e] bg-opacity-90 backdrop-blur-sm'
    : 'bg-white bg-opacity-60 backdrop-blur-sm';

  // Helper function to wrap routes with enhanced features
  const enhancedRoute = (Component, requiresAuth = true, requiresStaff = false) => {
    let RouteComponent = Component;

    // Wrap with loading and error boundaries
    RouteComponent = () => (
      <ErrorBoundary fallback="minimal">
        <LoadingState>
          <div className={`${containerBackground} min-h-screen`}>
            <Component />
          </div>
        </LoadingState>
      </ErrorBoundary>
    );

    // Apply authentication if required
    if (requiresAuth) {
      if (requiresStaff) {
        RouteComponent = () => (
          <StaffOnlyRoute>
            <RouteComponent />
          </StaffOnlyRoute>
        );
      } else {
        RouteComponent = () => (
          <ProtectedRoute>
            <RouteComponent />
          </ProtectedRoute>
        );
      }
    }

    return <RouteComponent />;
  };

  return (
    <div className={`${mainBackground} min-h-screen`}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={enhancedRoute(IntegratedHomePage)}
        />
        
        <Route 
          path="/home" 
          element={enhancedRoute(HomePage)}
        />
        
        <Route 
          path="/client-register" 
          element={enhancedRoute(PaternityTestForm, false)} // Allow public access for client registration
        />
        
        <Route 
          path="/sample-search" 
          element={enhancedRoute(SampleSearch)}
        />
        
        {/* Laboratory Management Routes */}
        <Route 
          path="/pcr-plate" 
          element={enhancedRoute(PCRPlate, true, true)} // Staff only
        />
        
        <Route 
          path="/pcr-batches" 
          element={enhancedRoute(PCRBatches, true, true)}
        />
        
        <Route 
          path="/electrophoresis-batches" 
          element={enhancedRoute(ElectrophoresisBatches, true, true)}
        />
        
        <Route 
          path="/rerun-batches" 
          element={enhancedRoute(RerunBatches, true, true)}
        />
        
        <Route 
          path="/electrophoresis-layout" 
          element={enhancedRoute(ElectrophoresisLayout, true, true)}
        />
        
        <Route 
          path="/genetic-analysis" 
          element={enhancedRoute(GeneticAnalysis, true, true)}
        />
        
        <Route 
          path="/quality-control" 
          element={enhancedRoute(QualityControlModule, true, true)}
        />
        
        <Route 
          path="/iso17025" 
          element={enhancedRoute(ISO17025Dashboard, true, true)}
        />
        
        <Route 
          path="/sample-management" 
          element={enhancedRoute(SampleManagement, true, true)}
        />
        
        <Route 
          path="/batch-completion" 
          element={enhancedRoute(BatchCompletion, true, true)}
        />
        
        <Route 
          path="/genemapper-import" 
          element={enhancedRoute(GeneMapperImport, true, true)}
        />
        
        {/* Reports and Results */}
        <Route 
          path="/reports" 
          element={enhancedRoute(Reports)}
        />
        
        <Route 
          path="/lab-results" 
          element={enhancedRoute(LabResults)}
        />
        
        <Route 
          path="/analysis-summary" 
          element={enhancedRoute(AnalysisSummary)}
        />
        
        <Route 
          path="/reruns" 
          element={enhancedRoute(Reruns, true, true)}
        />
        
        {/* Debug and Development Routes */}
        <Route 
          path="/api-test" 
          element={enhancedRoute(ApiTest, true, true)}
        />
        
        <Route 
          path="/debug" 
          element={enhancedRoute(DebugRouter, true, true)}
        />
        
        <Route 
          path="/test" 
          element={enhancedRoute(TestRoute, true, true)}
        />
        
        {/* PWA and Offline Routes */}
        <Route 
          path="/offline" 
          element={
            <ErrorBoundary fallback="minimal">
              <div className={`${containerBackground} min-h-screen flex items-center justify-center`}>
                <div className="text-center p-8">
                  <h1 className="text-2xl font-bold mb-4">You're Offline</h1>
                  <p className="text-gray-600 mb-4">
                    You're currently offline. Some features may be limited.
                  </p>
                  <p className="text-sm text-gray-500">
                    Data created offline will be synced when connection is restored.
                  </p>
                </div>
              </div>
            </ErrorBoundary>
          }
        />
        
        {/* Settings and Profile */}
        <Route 
          path="/settings" 
          element={
            <ErrorBoundary fallback="minimal">
              <LoadingState>
                <div className={`${containerBackground} min-h-screen p-8`}>
                  <h1 className="text-2xl font-bold mb-6">Settings</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-6 shadow-lg">
                      <h2 className="text-lg font-semibold mb-4">App Settings</h2>
                      <p>Theme, notifications, and display preferences</p>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-lg">
                      <h2 className="text-lg font-semibold mb-4">Account</h2>
                      <p>Profile information and security settings</p>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-lg">
                      <h2 className="text-lg font-semibold mb-4">Laboratory</h2>
                      <p>Equipment calibration and quality control settings</p>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-lg">
                      <h2 className="text-lg font-semibold mb-4">Data Management</h2>
                      <p>Backup, export, and data retention policies</p>
                    </div>
                  </div>
                </div>
              </LoadingState>
            </ErrorBoundary>
          }
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default AppRoutes;