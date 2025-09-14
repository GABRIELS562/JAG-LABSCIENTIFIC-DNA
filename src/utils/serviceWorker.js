// Service Worker registration and management for LIMS
import { getFeatureFlags, isProduction } from './environment';

const SW_FILE = '/sw.js';
const SW_SCOPE = '/';

// Service worker registration status
let swRegistration = null;
let isOnline = navigator.onLine;

// Initialize service worker
export const initServiceWorker = async () => {
  const features = getFeatureFlags();

  // Only register service worker in production or when explicitly enabled
  if (!features.enableServiceWorker) {
    console.log('[SW] Service worker disabled in current environment');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker not supported');
    return null;
  }

  try {
    console.log('[SW] Registering service worker...');

    const registration = await navigator.serviceWorker.register(SW_FILE, {
      scope: SW_SCOPE
    });

    swRegistration = registration;

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('[SW] New service worker available');
            showUpdateNotification();
          } else {
            // Service worker is ready
            console.log('[SW] Service worker is ready');
            showReadyNotification();
          }
        }
      });
    });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Monitor online/offline status
    window.addEventListener('online', () => {
      isOnline = true;
      console.log('[SW] Connection restored');
      triggerBackgroundSync();
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      console.log('[SW] Connection lost - entering offline mode');
    });

    console.log('[SW] Service worker registered successfully', registration);
    return registration;

  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
    return null;
  }
};

// Handle messages from service worker
const handleSWMessage = (event) => {
  const { data } = event;

  switch (data.type) {
    case 'OFFLINE_FALLBACK':
      console.log('[SW] Serving offline fallback for:', data.url);
      break;

    case 'CACHE_UPDATED':
      console.log('[SW] Cache updated for:', data.url);
      break;

    case 'SYNC_COMPLETE':
      console.log('[SW] Background sync completed');
      if (window.showErrorNotification) {
        window.showErrorNotification('Offline data synchronized', {
          severity: 'success',
          autoHide: true
        });
      }
      break;

    default:
      console.log('[SW] Unknown message:', data);
  }
};

// Show update notification when new service worker is available
const showUpdateNotification = () => {
  if (window.showErrorNotification) {
    window.showErrorNotification('Application update available', {
      severity: 'info',
      autoHide: false,
      title: 'Update Available',
      onRetry: () => {
        updateServiceWorker();
      }
    });
  }
};

// Show ready notification when service worker is ready
const showReadyNotification = () => {
  if (window.showErrorNotification && isProduction()) {
    window.showErrorNotification('Application is ready for offline use', {
      severity: 'success',
      autoHide: true,
      title: 'Ready for Offline Use'
    });
  }
};

// Update service worker
export const updateServiceWorker = async () => {
  if (!swRegistration) {
    console.warn('[SW] No service worker registration found');
    return;
  }

  try {
    console.log('[SW] Updating service worker...');

    // Force update
    await swRegistration.update();

    // Skip waiting and activate new service worker
    if (swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Reload page to use new service worker
    window.location.reload();

  } catch (error) {
    console.error('[SW] Service worker update failed:', error);
  }
};

// Trigger background sync for offline data
export const triggerBackgroundSync = async () => {
  if (!swRegistration || !isOnline) {
    return;
  }

  try {
    if ('sync' in swRegistration) {
      await swRegistration.sync.register('lims-offline-sync');
      console.log('[SW] Background sync registered');
    }
  } catch (error) {
    console.warn('[SW] Background sync registration failed:', error);
  }
};

// Check if app is running from cache (offline)
export const isAppCached = () => {
  return swRegistration && navigator.serviceWorker.controller;
};

// Get service worker status
export const getServiceWorkerStatus = () => {
  if (!swRegistration) {
    return {
      supported: 'serviceWorker' in navigator,
      registered: false,
      active: false,
      waiting: false,
      scope: null
    };
  }

  return {
    supported: true,
    registered: true,
    active: !!swRegistration.active,
    waiting: !!swRegistration.waiting,
    scope: swRegistration.scope,
    updateAvailable: !!swRegistration.waiting
  };
};

// Clear service worker cache
export const clearServiceWorkerCache = async () => {
  if (!('caches' in window)) {
    console.warn('[SW] Cache API not supported');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
    await Promise.all(deletePromises);

    console.log('[SW] All caches cleared');

    // Show notification
    if (window.showErrorNotification) {
      window.showErrorNotification('Application cache cleared', {
        severity: 'info',
        autoHide: true
      });
    }

  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
};

// Unregister service worker
export const unregisterServiceWorker = async () => {
  if (!swRegistration) {
    console.warn('[SW] No service worker registration found');
    return;
  }

  try {
    const success = await swRegistration.unregister();
    if (success) {
      console.log('[SW] Service worker unregistered successfully');
      swRegistration = null;
    }
    return success;
  } catch (error) {
    console.error('[SW] Service worker unregistration failed:', error);
    return false;
  }
};

// Initialize service worker on load
export const initSW = () => {
  // Wait for page to load before registering service worker
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServiceWorker);
  } else {
    initServiceWorker();
  }
};

export default {
  initServiceWorker,
  initSW,
  updateServiceWorker,
  triggerBackgroundSync,
  isAppCached,
  getServiceWorkerStatus,
  clearServiceWorkerCache,
  unregisterServiceWorker
};