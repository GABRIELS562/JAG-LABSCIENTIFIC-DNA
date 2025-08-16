/**
 * Service Worker registration and management
 * Handles offline capabilities, caching, and background sync
 */

class ServiceWorkerService {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.isOnline = navigator.onLine;
    this.pendingData = {
      samples: [],
      batches: [],
      reports: []
    };
    
    this.setupOnlineListeners();
  }

  // Register service worker
  async register() {
    if (!this.isSupported) {
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.notifyUpdateAvailable();
          }
        });
      });

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  // Notify user of available update
  notifyUpdateAvailable() {
    if (window.confirm('A new version is available. Reload to update?')) {
      window.location.reload();
    }
  }

  // Setup online/offline listeners
  setupOnlineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      });
  }

  // Check if app is online
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      isServiceWorkerActive: !!this.registration?.active
    };
  }

  // Add data to pending sync queue
  addToPendingSync(type, data) {
    if (!this.isOnline) {
      const pendingItem = {
        id: Date.now() + Math.random(),
        type,
        data,
        timestamp: new Date().toISOString()
      };

      this.pendingData[type].push(pendingItem);
      this.savePendingData(type);
      
      return pendingItem.id;
    }
    return null;
  }

  // Save pending data to localStorage
  savePendingData(type) {
    try {
      localStorage.setItem(`pending-${type}`, JSON.stringify(this.pendingData[type]));
    } catch (error) {
      console.error('Failed to save pending data:', error);
    }
  }

  // Load pending data from localStorage
  loadPendingData() {
    Object.keys(this.pendingData).forEach(type => {
      try {
        const stored = localStorage.getItem(`pending-${type}`);
        if (stored) {
          this.pendingData[type] = JSON.parse(stored);
        }
      } catch (error) {
        console.error(`Failed to load pending ${type}:`, error);
        this.pendingData[type] = [];
      }
    });
  }

  // Sync pending data when online
  async syncPendingData() {
    if (!this.isOnline || !this.registration) return;

    try {
      // Trigger background sync
      await this.registration.sync.register('sample-sync');
      await this.registration.sync.register('batch-sync');
      await this.registration.sync.register('report-sync');
      
      } catch (error) {
      console.error('❌ Background sync registration failed:', error);
      
      // Fallback: sync manually
      await this.manualSync();
    }
  }

  // Manual sync fallback
  async manualSync() {
    for (const type of Object.keys(this.pendingData)) {
      const items = [...this.pendingData[type]];
      
      for (const item of items) {
        try {
          const success = await this.syncItem(type, item);
          
          if (success) {
            this.removePendingItem(type, item.id);
          }
        } catch (error) {
          console.error(`Failed to sync ${type} item:`, error);
        }
      }
    }
  }

  // Sync individual item
  async syncItem(type, item) {
    const endpoints = {
      samples: '/api/samples',
      batches: '/api/batches',
      reports: '/api/reports'
    };

    const endpoint = endpoints[type];
    if (!endpoint) return false;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item.data)
      });

      return response.ok;
    } catch (error) {
      console.error(`Sync failed for ${type}:`, error);
      return false;
    }
  }

  // Remove item from pending sync
  removePendingItem(type, id) {
    this.pendingData[type] = this.pendingData[type].filter(item => item.id !== id);
    this.savePendingData(type);
    }

  // Get pending sync status
  getPendingStatus() {
    const status = {};
    Object.keys(this.pendingData).forEach(type => {
      status[type] = this.pendingData[type].length;
    });
    return status;
  }

  // Cache management
  async clearCache() {
    if (!this.registration) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('labscientific-'))
          .map(name => caches.delete(name))
      );
      
      return true;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return false;
    }
  }

  // Get cache storage estimate
  async getCacheSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage,
          available: estimate.quota,
          percentage: Math.round((estimate.usage / estimate.quota) * 100)
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
    return null;
  }

  // Offline sample creation
  async createSampleOffline(sampleData) {
    const pendingId = this.addToPendingSync('samples', sampleData);
    
    if (pendingId) {
      // Store sample locally for immediate UI feedback
      const localSample = {
        ...sampleData,
        id: `offline-${pendingId}`,
        status: 'pending_sync',
        created_offline: true,
        created_at: new Date().toISOString()
      };

      // You could store this in IndexedDB for more robust offline storage
      const existingSamples = JSON.parse(localStorage.getItem('offline-samples') || '[]');
      existingSamples.push(localSample);
      localStorage.setItem('offline-samples', JSON.stringify(existingSamples));

      return localSample;
    }

    throw new Error('Failed to create sample offline');
  }

  // Get offline samples
  getOfflineSamples() {
    try {
      return JSON.parse(localStorage.getItem('offline-samples') || '[]');
    } catch {
      return [];
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Subscribe to push notifications
  async subscribeToPushNotifications() {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Replace with your VAPID public key
          'YOUR_VAPID_PUBLIC_KEY'
        )
      });

      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return null;
    }
  }

  // Helper function for VAPID key conversion
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Initialize service worker
  async initialize() {
    const registered = await this.register();
    
    if (registered) {
      this.loadPendingData();
      
      // Sync any pending data
      if (this.isOnline) {
        await this.syncPendingData();
      }
      
      // Request notification permission
      await this.requestNotificationPermission();
    }

    return registered;
  }
}

// Singleton instance
const serviceWorkerService = new ServiceWorkerService();

export default serviceWorkerService;