import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, useTheme, useMediaQuery, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

// Import components
import HomePage from './components/ui/HomePage';
import IntegratedHomePage from './components/ui/IntegratedHomePage';
import ThemeToggle from './components/ui/ThemeToggle';
import Sidebar from './components/layout/Sidebar';
import Reports from './components/features/Reports';
import LabResults from './components/features/LabResults';
import ElectrophoresisBatches from './components/features/ElectrophoresisBatches';
import RerunBatches from './components/features/RerunBatches';
import SampleManagement from './components/features/SampleManagement';
import QualityControlModule from './components/features/QualityControlModule';
import PCRPlate from './components/features/PCRPlate';
import PCRBatches from './components/features/PCRBatches';
import SampleSearch from './components/features/SampleSearch';
import GeneticAnalysis from './components/features/genetic-analysis/GeneticAnalysisRefactored';
import AnalysisSummary from './components/features/AnalysisSummary';
import ElectrophoresisLayout from './components/features/ElectrophoresisLayout';
import Reruns from './components/features/Reruns';
import ApiTest from './components/debug/ApiTest';
import PaternityTestForm from './components/forms/PaternityTestForm';
import PeaceOfMindForm from './components/forms/PeaceOfMindForm';
import ISO17025Dashboard from './components/features/ISO17025Dashboard';
import TestRoute from './components/TestRoute';
import DebugRouter from './components/DebugRouter';
import BatchCompletion from './components/features/BatchCompletion';
import GeneMapperImport from './components/features/GeneMapperImport';

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
          <DebugRouter />
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
                  <IntegratedHomePage isDarkMode={isDarkMode} />
                </div>
              } 
            />
            
            <Route 
              path="/classic-home" 
              element={
                <div className={`min-h-screen w-full ${containerBackground} backdrop-blur-md`}>
                  <HomePage isDarkMode={isDarkMode} />
                </div>
              } 
            />
            
            <Route 
              path="/register-client" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <PaternityTestForm />
                </div>
              } 
            />
            
            <Route 
              path="/peace-of-mind" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <PeaceOfMindForm />
                </div>
              } 
            />
            
            <Route 
              path="/test" 
              element={<TestRoute />} 
            />
            <Route 
              path="/pcr-plate" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <PCRPlate />
                </div>
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
              path="/electrophoresis-batches" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <ElectrophoresisBatches />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/rerun-batches" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <RerunBatches />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/electrophoresis-layout" 
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
              path="/quality-control" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <QualityControlModule />
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
              path="/api-test" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <ApiTest />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <Reports />
                </div>
              } 
            />
            <Route 
              path="/iso17025" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <ISO17025Dashboard />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/batch-completion" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <BatchCompletion />
                  </div>
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/genemapper-import" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <GeneMapperImport />
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
              path="/samples" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <SampleManagement />
                </div>
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