import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, useTheme, useMediaQuery, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import PaternityTestForm from './components/forms/PaternityTestForm';
import HomePage from './components/ui/HomePage';
import ThemeToggle from './components/ui/ThemeToggle';
import Sidebar from './components/layout/Sidebar';
import Reports from './components/features/Reports';
import ReportsPage from './components/ui/ReportsPage';
import ElectrophoresisPlate from './components/features/GenerateBatch';
import ElectrophoresisBatches from './components/features/ElectrophoresisBatches';
import SampleSearch from './components/features/SampleSearch';
import SampleQueues from './components/features/SampleQueues';
import Statistics from './components/features/Statistics';
import QualityControl from './components/features/QualityControl';
import ClientRegister from './components/features/ClientRegister';
import PCRPlate from './components/features/PCRPlate';
import PCRBatches from './components/features/PCRBatches';
import GeneticAnalysis from './components/features/GeneticAnalysis';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';

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
                <div className={`${containerBackground} min-h-screen`}>
                  <PaternityTestForm />
                </div>
              } 
            />
            <Route 
              path="/client-register" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <ClientRegister />
                </div>
              } 
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
              path="/reports" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <ReportsPage />
                </div>
              } 
            />
            <Route 
              path="/lab-results" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <Reports />
                </div>
              } 
            />
            <Route 
              path="/pcr-batches" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <PCRBatches />
                </div>
              } 
            />
            <Route 
              path="/generate-batch" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <ElectrophoresisPlate />
                </div>
              } 
            />
            <Route 
              path="/electrophoresis-batches" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <ElectrophoresisBatches />
                </div>
              } 
            />
            <Route 
              path="/sample-search" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <SampleSearch />
                </div>
              } 
            />
            <Route 
              path="/sample-queues" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <SampleQueues />
                </div>
              } 
            />
            <Route 
              path="/statistics" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <Statistics />
                </div>
              } 
            />
            <Route 
              path="/quality-control" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <QualityControl />
                </div>
              } 
            />
            <Route 
              path="/genetic-analysis" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <GeneticAnalysis />
                </div>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Create Material-UI theme
const muiTheme = createTheme();

function App() {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </MuiThemeProvider>
  );
}

export default App;