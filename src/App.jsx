import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, useTheme, useMediaQuery, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

// Import components
import PaternityTestForm from './components/forms/PaternityTestForm';
import HomePage from './components/ui/HomePage';
import ThemeToggle from './components/ui/ThemeToggle';
import Sidebar from './components/layout/Sidebar';
import Reports from './components/features/Reports';
import LabResults from './components/features/LabResults';
import ElectrophoresisBatches from './components/features/ElectrophoresisBatches';
import SampleQueues from './components/features/SampleQueues';
import Statistics from './components/features/Statistics';
import QualityControlISO17025 from './components/features/QualityControlISO17025';
import ClientRegister from './components/features/ClientRegister';
import PCRPlate from './components/features/PCRPlate';
import PCRBatches from './components/features/PCRBatches';
import GeneticAnalysis from './components/features/genetic-analysis/GeneticAnalysisRefactored';
import AnalysisSummary from './components/features/AnalysisSummary';
import ElectrophoresisLayout from './components/features/ElectrophoresisLayout';
import Reruns from './components/features/Reruns';
import OsirisAnalysis from './components/features/OsirisAnalysis';
import QualityManagementSystem from './components/features/QualityManagementSystem';
import InventoryManagement from './components/features/InventoryManagement';
import AIMachineLearning from './components/features/AIMachineLearning';
import DNAExtraction from './components/features/DNAExtraction';

// Import authentication components
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute, { StaffOnlyRoute } from './components/auth/ProtectedRoute';

// Import contexts and utilities
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary, { withErrorBoundary } from './components/common/ErrorBoundary';

function AppContent() {
  const { isDarkMode, toggleTheme } = useThemeContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const mainBackground = isDarkMode
    ? 'bg-gradient-to-br from-[#022539] to-[#032539]'
    : 'bg-gradient-to-br from-[#DBF1FC] to-[#F5F5F5]';

  const containerBackground = isDarkMode
    ? 'bg-[#032539]/70'
    : 'bg-white/70';

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
      <div className={`flex h-screen w-screen ${mainBackground}`}>
        {/* Mobile AppBar */}
        {isMobile && (
          <AppBar 
            position="fixed" 
            sx={{ 
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: isDarkMode ? '#022539' : '#0D488F',
              display: { xs: 'block', md: 'none' }
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}
        
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        
        <main className={`flex-1 overflow-y-auto w-full ${isMobile ? 'pt-16' : ''}`}>
          <ThemeToggle onToggle={toggleTheme} isDarkMode={isDarkMode} />
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
                <div className={`min-h-screen w-full ${containerBackground} backdrop-blur-md`}>
                  <HomePage isDarkMode={isDarkMode} />
                </div>
              } 
            />
            
            <Route 
              path="/register-client" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <PaternityTestForm />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/client-register" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <ClientRegister />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/pcr-plate" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <PCRPlate />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/pcr-batches" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <PCRBatches />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/electrophoresis" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <ElectrophoresisLayout />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/genetic-analysis" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <GeneticAnalysis />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/osiris-analysis" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <OsirisAnalysis />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/quality-control" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <QualityControlISO17025 />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/qms" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <QualityManagementSystem />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <InventoryManagement />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/ai-ml" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <AIMachineLearning />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/dna-extraction" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <DNAExtraction />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/reruns" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Reruns />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Reports />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/lab-results" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <LabResults />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/sample-queues" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <SampleQueues />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/statistics" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <Statistics />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/analysis-summary" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <AnalysisSummary />
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