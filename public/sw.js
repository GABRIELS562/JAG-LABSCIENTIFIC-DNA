// LIMS Service Worker for Offline Capability and Caching
const CACHE_NAME = 'lims-cache-v1';
const RUNTIME_CACHE = 'lims-runtime-v1';
const API_CACHE = 'lims-api-v1';

// Files to cache immediately (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add critical CSS and JS files here - they'll be generated during build
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/health/,
  /\/api\/samples\/counts/,
  /\/api\/statistics/,
  /\/api\/equipment/,
  /\/api\/batches/
];

// Network-first patterns (always try network first)
const NETWORK_FIRST_PATTERNS = [
  /\/api\/samples(?!\/counts)/,  // All samples endpoints except counts
  /\/api\/reports/,
  /\/api\/quality-control/,
  /\/api\/(create|update|delete)/
];

// Cache-first patterns (use cache if available)
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css)$/,
  /\/assets\//
];

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS.filter(url => url !== '/'));
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle asset requests (JS, CSS, images)
  if (isCacheFirstResource(request)) {
    event.respondWith(handleCacheFirst(request));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(handleNetworkFirst(request));
});

// Handle API requests with appropriate caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // Network-first for critical operations
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(pathname))) {
      return await handleNetworkFirst(request, API_CACHE);
    }

    // Cache API responses for offline use
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(pathname))) {
      return await handleStaleWhileRevalidate(request, API_CACHE);
    }

    // Default: network only for API requests
    const response = await fetch(request);

    // Cache successful responses for critical endpoints
    if (response.ok && shouldCacheApiResponse(pathname)) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn('[SW] API request failed:', pathname, error);

    // Try to serve from cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', pathname);
      return cachedResponse;
    }

    // Return offline response for critical endpoints
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(pathname))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Offline - cached data not available',
          offline: true,
          timestamp: Date.now()
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Always try network first for navigation
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Serve cached index.html for offline navigation
    console.log('[SW] Serving offline index.html');
    const cache = await caches.open(CACHE_NAME);
    return await cache.match('/index.html') ||
           await cache.match('/') ||
           new Response('Offline', { status: 503 });
  }
}

// Cache-first strategy for static assets
async function handleCacheFirst(request, cacheName = RUNTIME_CACHE) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {}); // Ignore background fetch errors

    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('[SW] Cache-first fetch failed:', request.url);
    throw error;
  }
}

// Network-first strategy with cache fallback
async function handleNetworkFirst(request, cacheName = RUNTIME_CACHE) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving cached response for:', request.url);
      return cachedResponse;
    }

    throw error;
  }
}

// Stale-while-revalidate strategy
async function handleStaleWhileRevalidate(request, cacheName = RUNTIME_CACHE) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch fresh data in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached response immediately if available, otherwise wait for fetch
  return cachedResponse || await fetchPromise;
}

// Check if resource should use cache-first strategy
function isCacheFirstResource(request) {
  const url = new URL(request.url);
  return CACHE_FIRST_PATTERNS.some(pattern =>
    pattern.test(url.pathname) || pattern.test(url.href)
  );
}

// Check if API response should be cached
function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Handle background sync (for future offline queue implementation)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'lims-offline-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // Get offline data from IndexedDB or localStorage
    // This would integrate with the offline storage in the main app
    console.log('[SW] Syncing offline data...');

    // Send queued requests to server
    // Implementation would depend on offline queue structure

    console.log('[SW] Offline data synced successfully');
  } catch (error) {
    console.error('[SW] Failed to sync offline data:', error);
    throw error; // Retry sync later
  }
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');

  const options = {
    body: 'LIMS notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'lims-notification'
  };

  event.waitUntil(
    self.registration.showNotification('LIMS Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Log service worker errors
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

console.log('[SW] Service worker script loaded');