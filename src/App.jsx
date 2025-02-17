import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PaternityTestForm from './components/forms/PaternityTestForm';
import LabCarousel from './components/ui/LabCarousel';
import ThemeToggle from './components/ui/ThemeToggle';
import Sidebar from './components/layout/Sidebar';
import Reports from './components/features/Reports';
import GenerateBatch from './components/features/GenerateBatch';
import SampleSearch from './components/features/SampleSearch';
import Statistics from './components/features/Statistics';
import QualityControl from './components/features/QualityControl';
import { Box, CssBaseline } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';

function AppContent() {
  const { theme, isDarkMode, toggleTheme } = useThemeContext();

  const mainBackground = isDarkMode
    ? 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)'
    : 'linear-gradient(145deg, #e6e9f0 0%, #eef1f5 100%)';

  const containerBackground = isDarkMode
    ? 'rgba(0, 0, 0, 0.7)'
    : 'rgba(255, 255, 255, 0.7)';

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh', width: '100vw' }}>
          <Sidebar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              background: mainBackground,
              overflowY: 'auto',
              padding: 0,
              width: '100%',
              transition: 'background 0.3s ease',
            }}
          >
            <ThemeToggle onToggle={toggleTheme} isDarkMode={isDarkMode} />
            <Routes>
              <Route 
                path="/" 
                element={
                  <Box 
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '100vh',
                      width: '100%',
                      padding: 0,
                      background: containerBackground,
                      backdropFilter: 'blur(10px)',
                      transition: 'background 0.3s ease',
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: '100%', 
                        maxWidth: '1200px',
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <Box 
                        component="h1"
                        sx={{ 
                          color: isDarkMode ? '#fff' : '#1e4976',
                          fontSize: '2.5rem',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          mb: 6,
                          mt: 0,
                          transition: 'color 0.3s ease',
                        }}
                      >
                        Welcome to LabDNA Scientific
                      </Box>
                      <LabCarousel />
                    </Box>
                  </Box>
                } 
              />
              <Route 
                path="/register-client" 
                element={
                  <Box sx={{ 
                    background: containerBackground,
                    minHeight: '100vh',
                    transition: 'background 0.3s ease',
                  }}>
                    <PaternityTestForm />
                  </Box>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <Box sx={{ 
                    background: containerBackground,
                    minHeight: '100vh',
                    transition: 'background 0.3s ease',
                  }}>
                    <Reports />
                  </Box>
                } 
              />
              <Route 
                path="/generate-batch" 
                element={
                  <Box sx={{ 
                    background: containerBackground,
                    minHeight: '100vh',
                    transition: 'background 0.3s ease',
                  }}>
                    <GenerateBatch />
                  </Box>
                } 
              />
              <Route 
                path="/assign-lab-number" 
                element={
                  <Box sx={{ 
                    background: containerBackground,
                    minHeight: '100vh',
                    p: 3,
                    transition: 'background 0.3s ease',
                  }}>
                    <div>Assign Lab Number Page</div>
                  </Box>
                } 
              />
              <Route path="/sample-search" element={<SampleSearch />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route 
                path="/quality-control" 
                element={
                  <Box sx={{ 
                    background: containerBackground,
                    minHeight: '100vh',
                    transition: 'background 0.3s ease',
                  }}>
                    <QualityControl />
                  </Box>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;