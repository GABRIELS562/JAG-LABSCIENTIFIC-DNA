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
import ReportsPage from './components/ui/ReportsPage';
import ElectrophoresisBatches from './components/features/ElectrophoresisBatches';
import SampleSearch from './components/features/SampleSearch';
import SampleQueues from './components/features/SampleQueues';
import Statistics from './components/features/Statistics';
import QualityControl from './components/features/QualityControl';
import ClientRegister from './components/features/ClientRegister';
import PCRPlate from './components/features/PCRPlate';
import PCRBatches from './components/features/PCRBatches';
import GeneticAnalysis from './components/features/genetic-analysis/GeneticAnalysisRefactored';
import AnalysisSummary from './components/features/AnalysisSummary';
import ElectrophoresisLayout from './components/features/ElectrophoresisLayout';
import Reruns from './components/features/Reruns';
import ApiTest from './components/debug/ApiTest';

// Import contexts and utilities
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
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
                    <ReportsPage />
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
              path="/sample-search" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <SampleSearch />
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
              path="/quality-control" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <QualityControl />
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
              path="/analysis-summary" 
              element={
                <ErrorBoundary fallback="minimal">
                  <div className={`${containerBackground} min-h-screen`}>
                    <AnalysisSummary />
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
      <ThemeProvider>
        <AppWithTheme />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;