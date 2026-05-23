import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, useTheme, useMediaQuery, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

// Import critical components (above the fold)
import ThemeToggle from './components/ui/ThemeToggle';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './components/auth/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import ConnectionStatus from './components/ui/ConnectionStatus';
import ErrorNotification from './components/ui/ErrorNotification';
import { FullPageSkeleton } from './components/ui/SkeletonLoaders';

// Lazy load large feature components
const PaternityLabDashboard = lazy(() => import('./components/features/PaternityLabDashboard'));
const ForensicWorkflowDashboard = lazy(() => import('./components/features/ForensicWorkflowDashboard'));
const PaternityTestForm = lazy(() => import('./components/forms/PaternityTestForm'));
const ClientRegister = lazy(() => import('./components/features/ClientRegister'));
const PCRPlate = lazy(() => import('./components/features/PCRPlate'));
const PCRBatches = lazy(() => import('./components/features/PCRBatches'));
const ElectrophoresisLayout = lazy(() => import('./components/features/ElectrophoresisLayout'));
const GeneticAnalysis = lazy(() => import('./components/features/genetic-analysis/GeneticAnalysisRefactored'));
const OsirisAnalysis = lazy(() => import('./components/features/OsirisAnalysis'));
const QualityControlISO17025 = lazy(() => import('./components/features/QualityControlISO17025'));
const QualityManagementSystem = lazy(() => import('./components/features/QualityManagementSystem'));
const InventoryManagement = lazy(() => import('./components/features/InventoryManagement'));
const AIMachineLearning = lazy(() => import('./components/features/AIMachineLearning'));
const DNAExtraction = lazy(() => import('./components/features/DNAExtraction'));
const QpcrQuantification = lazy(() => import('./components/features/QpcrQuantification'));
const Reruns = lazy(() => import('./components/features/Reruns'));
const Reports = lazy(() => import('./components/features/Reports'));
const LabResults = lazy(() => import('./components/features/LabResults'));
const SampleQueues = lazy(() => import('./components/features/SampleQueues'));
const Statistics = lazy(() => import('./components/features/Statistics'));
const AnalysisSummary = lazy(() => import('./components/features/AnalysisSummary'));
const ForensicReports = lazy(() => import('./components/features/ForensicReports'));
const WorkflowSettings = lazy(() => import('./components/features/WorkflowSettings'));
const CaseManagement = lazy(() => import('./components/features/CaseManagement'));

// Enhanced loading component for Suspense fallback
const LoadingSpinner = ({ minHeight = 'min-h-screen', type = 'dashboard' }) => (
  <div className={`${minHeight} w-full`}>
    <FullPageSkeleton type={type} />
  </div>
);

// Import contexts and utilities
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

function AppContent() {
  const { isDarkMode, toggleTheme } = useThemeContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Dark Lab Mode backgrounds
  const mainBackground = 'bg-gradient-to-br from-[#0a0a0f] via-[#12121f] to-[#0a0a0f]';

  const containerBackground = 'bg-[#1a1a2e]/60 backdrop-blur-sm';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className={`flex h-screen w-screen ${mainBackground} transition-colors duration-300`}>
        {/* Mobile AppBar */}
        {isMobile && (
          <AppBar
            position="fixed"
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
              background: 'rgba(10, 10, 15, 0.9)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(42, 42, 74, 0.5)',
              display: { xs: 'block', md: 'none' }
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, color: '#00d4ff' }}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}
        
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        
        <main className={`flex-1 overflow-y-auto w-full ${isMobile ? 'pt-16' : ''}`}>
          <ThemeToggle onToggle={toggleTheme} isDarkMode={isDarkMode} />
          <ConnectionStatus />
          <ErrorNotification />
          <Routes>
            {/* Authentication pages - accessible separately */}
            <Route 
              path="/login" 
              element={<LoginPage />} 
            />
            <Route 
              path="/admin" 
              element={<LoginPage />} 
            />
            
            {/* Routes - temporarily disabled authentication for development */}
            <Route 
              path="/" 
              element={
                <ErrorBoundary>
                  <div className={`min-h-screen w-full ${containerBackground} backdrop-blur-md`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <PaternityLabDashboard />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            
            <Route 
              path="/forensic-dashboard" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ForensicWorkflowDashboard />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            
            <Route 
              path="/register-client" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <PaternityTestForm />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/client-register" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ClientRegister />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/pcr-plate" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <PCRPlate />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/pcr-batches" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <PCRBatches />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/electrophoresis" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ElectrophoresisLayout />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/genetic-analysis" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <GeneticAnalysis />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/osiris-analysis" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <OsirisAnalysis />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/quality-control" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <QualityControlISO17025 />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/qms" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <QualityManagementSystem />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <InventoryManagement />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/ai-ml" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AIMachineLearning />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/forensic-reports" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ForensicReports />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/case-management" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <CaseManagement />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/workflow-settings" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <WorkflowSettings />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/dna-extraction" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <DNAExtraction />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/qpcr-quantification" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <QpcrQuantification />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/reruns" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Reruns />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Reports />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/lab-results" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <LabResults />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/sample-queues" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <SampleQueues />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/statistics" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Statistics />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/analysis-summary" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AnalysisSummary />
                    </Suspense>
                  </div>
                </ErrorBoundary>
              } 
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function AppWithTheme() {
  const { theme } = useThemeContext();
  
  return (
    <MuiThemeProvider theme={theme}>
      <AppContent />
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <AppWithTheme />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;