import React, { createContext, useContext, useEffect, useState } from 'react';
import serviceWorkerService from '../services/serviceWorkerService';
import webSocketService from '../services/websocketService';
import { showError, createError } from '../components/common/ErrorHandler';

const PWAContext = createContext();

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
};

export const PWAProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [cacheSize, setCacheSize] = useState(null);

  // Initialize PWA features
  useEffect(() => {
    initializePWA();
    setupEventListeners();
    
    return () => {
      // Cleanup listeners
    };
  }, []);

  const initializePWA = async () => {
    try {
      // Initialize service worker
      const swReady = await serviceWorkerService.initialize();
      setServiceWorkerReady(swReady);

      // Initialize WebSocket for real-time features
      webSocketService.connect();

      // Check if app is already installed
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

      // Get cache size
      const size = await serviceWorkerService.getCacheSize();
      setCacheSize(size);

      // Get pending sync count
      const pendingStatus = serviceWorkerService.getPendingStatus();
      const totalPending = Object.values(pendingStatus).reduce((sum, count) => sum + count, 0);
      setPendingSyncCount(totalPending);

    } catch (error) {
      console.error('PWA initialization failed:', error);
    }
  };

  const setupEventListeners = () => {
    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      showError(createError('Connection restored', {
        code: 'CONNECTION_RESTORED',
        severity: 'info'
      }));
    };

    const handleOffline = () => {
      setIsOnline(false);
      showError(createError('You are now offline. Some features may be limited.', {
        code: 'CONNECTION_LOST',
        severity: 'warning'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      
      showError(createError('App installed successfully!', {
        code: 'APP_INSTALLED',
        severity: 'info'
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Service worker update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  };

  // Install the app
  const installApp = async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      setInstallPrompt(null);
      setIsInstallable(false);
      
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  };

  // Update the app
  const updateApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  // Clear app cache
  const clearCache = async () => {
    try {
      const success = await serviceWorkerService.clearCache();
      if (success) {
        setCacheSize(null);
        showError(createError('Cache cleared successfully', {
          code: 'CACHE_CLEARED',
          severity: 'info'
        }));
      }
      return success;
    } catch (error) {
      showError(createError('Failed to clear cache', {
        code: 'CACHE_CLEAR_FAILED',
        severity: 'error'
      }));
      return false;
    }
  };

  // Share content (if supported)
  const shareContent = async (data) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Sharing failed:', error);
        }
        return false;
      }
    }
    return false;
  };

  // Add to home screen prompt
  const showInstallPrompt = () => {
    if (isInstallable && installPrompt) {
      return installApp();
    }
    
    // Fallback instructions for different platforms
    let instructions = '';
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      instructions = 'Tap the share button and select "Add to Home Screen"';
    } else if (userAgent.includes('android')) {
      instructions = 'Tap the menu button and select "Add to Home Screen" or "Install App"';
    } else {
      instructions = 'Look for the install button in your browser\'s address bar';
    }

    showError(createError(`To install this app: ${instructions}`, {
      code: 'INSTALL_INSTRUCTIONS',
      severity: 'info'
    }));

    return false;
  };

  // Request persistent storage
  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        if (granted) {
          showError(createError('Persistent storage granted', {
            code: 'STORAGE_PERSISTENT',
            severity: 'info'
          }));
        }
        return granted;
      } catch (error) {
        console.error('Persistent storage request failed:', error);
        return false;
      }
    }
    return false;
  };

  // Get device info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    
    return {
      userAgent,
      platform,
      isMobile,
      isTablet,
      isDesktop,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  };

  // Handle file sharing (for PWA file handling)
  const handleSharedFiles = (files) => {
    // Process shared files (CSV imports, etc.)
    files.forEach(file => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Handle CSV import
        showError(createError(`CSV file received: ${file.name}`, {
          code: 'FILE_SHARED_CSV',
          severity: 'info'
        }));
      } else if (file.name.endsWith('.fsa')) {
        // Handle FSA files
        showError(createError(`FSA file received: ${file.name}`, {
          code: 'FILE_SHARED_FSA',
          severity: 'info'
        }));
      }
    });
  };

  // Check for updates periodically
  useEffect(() => {
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.update();
        }
      }
    };

    const updateInterval = setInterval(checkForUpdates, 60000); // Check every minute
    
    return () => clearInterval(updateInterval);
  }, []);

  const value = {
    // State
    isOnline,
    isInstallable,
    isInstalled,
    updateAvailable,
    pendingSyncCount,
    serviceWorkerReady,
    cacheSize,

    // Actions
    installApp,
    updateApp,
    clearCache,
    shareContent,
    showInstallPrompt,
    requestPersistentStorage,
    handleSharedFiles,

    // Utils
    getDeviceInfo,

    // Services
    serviceWorkerService,
    webSocketService
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export default PWAProvider;