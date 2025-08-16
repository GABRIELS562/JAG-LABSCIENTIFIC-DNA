// LabScientific LIMS Service Worker
// Provides offline capabilities, caching, and background sync

const CACHE_NAME = 'labscientific-lims-v1.0.0';
const STATIC_CACHE = 'labscientific-static-v1.0.0';
const DYNAMIC_CACHE = 'labscientific-dynamic-v1.0.0';
const API_CACHE = 'labscientific-api-v1.0.0';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/labdna-logo-light.png',
  '/labdna-logo-dark.png',
  // Add other critical static assets
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/samples',
  '/api/batches',
  '/api/equipment',
  '/api/quality-control'
];

// Maximum cache age in milliseconds
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('labscientific-') && 
                     cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheName = API_CACHE;

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && isCacheableApi(url.pathname)) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      
      // Add timestamp for cache expiration
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...responseClone.headers,
          'sw-cache-timestamp': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, checking cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');
      
      if (cacheAge < API_CACHE_MAX_AGE) {
        console.log('📦 Serving fresh cached API response');
        return cachedResponse;
      } else {
        console.log('⏰ Cached API response expired');
      }
    }
    
    // Return offline response for critical APIs
    if (isCriticalApi(url.pathname)) {
      return createOfflineApiResponse(url.pathname);
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('📦 Serving cached static asset:', request.url);
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Failed to serve static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first, fallback to cache
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed for page, checking cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to index.html for SPA routing
    const indexResponse = await caches.match('/index.html');
    
    if (indexResponse) {
      console.log('📄 Serving cached index.html for SPA route');
      return indexResponse;
    }
    
    throw error;
  }
}

// Helper functions
function isStaticAsset(request) {
  return request.url.includes('/static/') ||
         request.url.includes('/assets/') ||
         request.url.includes('/images/') ||
         request.url.endsWith('.js') ||
         request.url.endsWith('.css') ||
         request.url.endsWith('.png') ||
         request.url.endsWith('.jpg') ||
         request.url.endsWith('.jpeg') ||
         request.url.endsWith('.svg') ||
         request.url.endsWith('.ico');
}

function isCacheableApi(pathname) {
  return CACHEABLE_APIS.some(api => pathname.startsWith(api));
}

function isCriticalApi(pathname) {
  const criticalApis = ['/api/samples', '/api/auth/verify'];
  return criticalApis.some(api => pathname.startsWith(api));
}

function createOfflineApiResponse(pathname) {
  let offlineData = {};
  
  switch (true) {
    case pathname.startsWith('/api/samples'):
      offlineData = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        offline: true,
        message: 'Offline mode - showing cached data only'
      };
      break;
      
    case pathname.startsWith('/api/batches'):
      offlineData = {
        data: [],
        offline: true,
        message: 'Offline mode - batch data unavailable'
      };
      break;
      
    default:
      offlineData = {
        offline: true,
        message: 'This feature is not available offline'
      };
  }
  
  return new Response(JSON.stringify(offlineData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Response': 'true'
    }
  });
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sample-sync') {
    event.waitUntil(syncPendingSamples());
  } else if (event.tag === 'batch-sync') {
    event.waitUntil(syncPendingBatches());
  }
});

// Sync pending samples when online
async function syncPendingSamples() {
  try {
    // Get pending samples from IndexedDB or localStorage
    const pendingSamples = await getPendingData('samples');
    
    for (const sample of pendingSamples) {
      try {
        const response = await fetch('/api/samples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sample.data)
        });
        
        if (response.ok) {
          await removePendingData('samples', sample.id);
          console.log('✅ Synced sample:', sample.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync sample:', sample.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Sync pending batches when online
async function syncPendingBatches() {
  try {
    const pendingBatches = await getPendingData('batches');
    
    for (const batch of pendingBatches) {
      try {
        const response = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.data)
        });
        
        if (response.ok) {
          await removePendingData('batches', batch.id);
          console.log('✅ Synced batch:', batch.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync batch:', batch.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background batch sync failed:', error);
  }
}

// Helper functions for pending data management
async function getPendingData(type) {
  try {
    const stored = localStorage.getItem(`pending-${type}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function removePendingData(type, id) {
  try {
    const pending = await getPendingData(type);
    const filtered = pending.filter(item => item.id !== id);
    localStorage.setItem(`pending-${type}`, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pending data:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from LabScientific LIMS',
      icon: '/labdna-logo-light.png',
      badge: '/labdna-logo-light.png',
      tag: data.tag || 'general',
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'LabScientific LIMS', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Clean up old caches periodically
setInterval(() => {
  cleanupOldCaches();
}, 60 * 60 * 1000); // Every hour

async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('labscientific-')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          const response = await cache.match(request);
          const cacheTimestamp = response.headers.get('sw-cache-timestamp');
          
          if (cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            
            if (cacheAge > CACHE_MAX_AGE) {
              await cache.delete(request);
              console.log('🗑️ Cleaned up old cache entry:', request.url);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
  }
}

console.log('🎯 LabScientific LIMS Service Worker loaded');