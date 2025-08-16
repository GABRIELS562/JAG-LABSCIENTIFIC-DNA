import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';

// Import all the new enhanced components
import PWAProvider, { usePWA } from '../../contexts/PWAContext';
import { LoadingProvider, GlobalLoadingBackdrop } from '../common/LoadingSystem';
import { ErrorHandlerProvider, registerErrorHandler } from '../common/ErrorHandler';
import MobileLayout from './MobileLayout';
import Sidebar from './Sidebar';

// Import existing contexts
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import ErrorBoundary from '../common/ErrorBoundary';

// Import the main app content
import AppRoutes from './AppRoutes';

/**
 * Enhanced App wrapper with PWA, offline, and mobile features
 */
function EnhancedAppContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isOnline, serviceWorkerReady, updateAvailable, updateApp } = usePWA();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShowUpdatePrompt(true);
    }
  }, [updateAvailable]);

  const handleUpdate = async () => {
    await updateApp();
    setShowUpdatePrompt(false);
  };

  // Choose layout based on device type
  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <ErrorBoundary>
      <Layout>
        <AppRoutes />
        
        {/* Update Prompt */}
        {showUpdatePrompt && (
          <UpdatePrompt onUpdate={handleUpdate} onDismiss={() => setShowUpdatePrompt(false)} />
        )}
        
        {/* Global Loading Backdrop */}
        <GlobalLoadingBackdrop />
      </Layout>
    </ErrorBoundary>
  );
}

/**
 * Desktop layout component (keeps existing sidebar layout)
 */
function DesktopLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main style={{ flexGrow: 1, padding: '20px' }}>
        {children}
      </main>
    </div>
  );
}

/**
 * Update prompt component
 */
function UpdatePrompt({ onUpdate, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      <div>
        <strong>Update Available</strong>
        <br />
        <small>A new version of the app is ready to install</small>
      </div>
      <div>
        <button
          onClick={onUpdate}
          style={{
            backgroundColor: 'white',
            color: '#1976d2',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginRight: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Update
        </button>
        <button
          onClick={onDismiss}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}

/**
 * Main Enhanced App component with all providers
 */
function EnhancedApp() {
  return (
    <ErrorHandlerProvider>
      <LoadingProvider>
        <PWAProvider>
          <ThemeProvider>
            <AuthProvider>
              <Router>
                <EnhancedAppContent />
              </Router>
            </AuthProvider>
          </ThemeProvider>
        </PWAProvider>
      </LoadingProvider>
    </ErrorHandlerProvider>
  );
}

export default EnhancedApp;