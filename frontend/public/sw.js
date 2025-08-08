/**
 * Service Worker for ColdCaller PWA
 * Implements caching strategies, offline functionality, and background sync
 */

const CACHE_NAME = 'coldcaller-v1.2.0';
const CACHE_PREFIX = 'coldcaller';
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;
const DATA_CACHE = `${CACHE_PREFIX}-data`;
const AUDIO_CACHE = `${CACHE_PREFIX}-audio`;

// Resources to cache immediately
const STATIC_CACHE_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache with different strategies
const API_CACHE_CONFIG = {
  // Cache-first for static data
  cacheFirst: [
    '/api/scripts',
    '/api/health'
  ],
  // Network-first for dynamic data
  networkFirst: [
    '/api/leads',
    '/api/calls',
    '/api/analytics'
  ],
  // Stale-while-revalidate for performance data
  staleWhileRevalidate: [
    '/api/performance'
  ]
};

// Performance monitoring
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  offlineRequests: 0,
  averageResponseTime: 0
};

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching static resources');
        return cache.addAll(STATIC_CACHE_RESOURCES);
      }),
      
      // Initialize runtime cache
      caches.open(RUNTIME_CACHE).then(cache => {
        console.log('🏃 Runtime cache initialized');
      }),
      
      // Initialize data cache
      caches.open(DATA_CACHE).then(cache => {
        console.log('💾 Data cache initialized');
      }),
      
      // Initialize audio cache
      caches.open(AUDIO_CACHE).then(cache => {
        console.log('🎵 Audio cache initialized');
      })
    ]).then(() => {
      console.log('✅ Service Worker installation complete');
      // Force activation
      self.skipWaiting();
    }).catch(error => {
      console.error('❌ Service Worker installation failed:', error);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old versions of our cache
          if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && cacheName !== DATA_CACHE && 
              cacheName !== AUDIO_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      // Take control immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isAudioRequest(request)) {
    event.respondWith(handleAudioRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with different caching strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const startTime = performance.now();
  
  try {
    // Determine caching strategy
    if (API_CACHE_CONFIG.cacheFirst.some(path => pathname.startsWith(path))) {
      return await cacheFirst(request, DATA_CACHE);
    } else if (API_CACHE_CONFIG.networkFirst.some(path => pathname.startsWith(path))) {
      return await networkFirst(request, DATA_CACHE);
    } else if (API_CACHE_CONFIG.staleWhileRevalidate.some(path => pathname.startsWith(path))) {
      return await staleWhileRevalidate(request, DATA_CACHE);
    } else {
      // Default: network-only for uncategorized API requests
      return await networkOnly(request);
    }
  } catch (error) {
    console.error('❌ API request failed:', error);
    return createErrorResponse('API request failed');
  } finally {
    recordPerformanceMetric(performance.now() - startTime);
  }
}

// Handle audio file requests
async function handleAudioRequest(request) {
  const startTime = performance.now();
  
  try {
    // Audio files: cache-first (they don't change often)
    const cachedResponse = await caches.match(request, { cacheName: AUDIO_CACHE });
    
    if (cachedResponse) {
      performanceMetrics.cacheHits++;
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    performanceMetrics.cacheMisses++;
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful audio responses
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ Audio request failed:', error);
    performanceMetrics.offlineRequests++;
    
    // Return cached version if available
    const cachedResponse = await caches.match(request, { cacheName: AUDIO_CACHE });
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return createErrorResponse('Audio file not available offline');
  } finally {
    recordPerformanceMetric(performance.now() - startTime);
  }
}

// Handle static assets (JS, CSS, images)
async function handleStaticAsset(request) {
  const startTime = performance.now();
  
  try {
    // Static assets: cache-first with long TTL
    const cachedResponse = await caches.match(request, { cacheName: CACHE_NAME });
    
    if (cachedResponse) {
      performanceMetrics.cacheHits++;
      return cachedResponse;
    }
    
    performanceMetrics.cacheMisses++;
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ Static asset request failed:', error);
    performanceMetrics.offlineRequests++;
    return createErrorResponse('Static asset not available offline');
  } finally {
    recordPerformanceMetric(performance.now() - startTime);
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  const startTime = performance.now();
  
  try {
    // Try network first for HTML
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.warn('⚠️ Network failed for navigation, trying cache:', error.message);
    performanceMetrics.offlineRequests++;
    
    // Fallback to cached version
    const cachedResponse = await caches.match(request, { cacheName: RUNTIME_CACHE });
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ultimate fallback: serve cached index.html for SPA routing
    const indexResponse = await caches.match('/', { cacheName: CACHE_NAME });
    if (indexResponse) {
      return indexResponse;
    }
    
    return createErrorResponse('Application not available offline');
  } finally {
    recordPerformanceMetric(performance.now() - startTime);
  }
}

// Caching strategy implementations
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request, { cacheName });
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  performanceMetrics.cacheMisses++;
  performanceMetrics.networkRequests++;
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    performanceMetrics.offlineRequests++;
    throw error;
  }
}

async function networkFirst(request, cacheName, timeout = 3000) {
  try {
    performanceMetrics.networkRequests++;
    
    // Race network request against timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.warn('⚠️ Network failed, trying cache:', error.message);
    performanceMetrics.offlineRequests++;
    
    const cachedResponse = await caches.match(request, { cacheName });
    if (cachedResponse) {
      performanceMetrics.cacheHits++;
      return cachedResponse;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request, { cacheName });
  
  // Always try to revalidate in the background
  const networkResponsePromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(error => {
    console.warn('⚠️ Background revalidation failed:', error.message);
  });
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  // No cache, wait for network
  performanceMetrics.cacheMisses++;
  performanceMetrics.networkRequests++;
  return await networkResponsePromise;
}

async function networkOnly(request) {
  performanceMetrics.networkRequests++;
  return await fetch(request);
}

// Utility functions
function isAudioRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/audio/') || 
         url.pathname.endsWith('.mp3') ||
         url.pathname.endsWith('.wav') ||
         url.pathname.endsWith('.ogg');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico');
}

function createErrorResponse(message) {
  return new Response(
    JSON.stringify({ 
      error: message, 
      offline: true,
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

function recordPerformanceMetric(responseTime) {
  const currentAvg = performanceMetrics.averageResponseTime;
  const totalRequests = performanceMetrics.networkRequests + performanceMetrics.cacheHits;
  
  performanceMetrics.averageResponseTime = 
    (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-calls') {
    event.waitUntil(syncOfflineCalls());
  } else if (event.tag === 'background-sync-leads') {
    event.waitUntil(syncOfflineLeads());
  }
});

// Sync offline call data
async function syncOfflineCalls() {
  try {
    const db = await openIndexedDB();
    const offlineCalls = await getOfflineData(db, 'calls');
    
    for (const call of offlineCalls) {
      try {
        const response = await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(call.data)
        });
        
        if (response.ok) {
          await removeOfflineData(db, 'calls', call.id);
          console.log('✅ Synced offline call:', call.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync call:', call.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Sync offline lead data
async function syncOfflineLeads() {
  try {
    const db = await openIndexedDB();
    const offlineLeads = await getOfflineData(db, 'leads');
    
    for (const lead of offlineLeads) {
      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead.data)
        });
        
        if (response.ok) {
          await removeOfflineData(db, 'leads', lead.id);
          console.log('✅ Synced offline lead:', lead.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync lead:', lead.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// IndexedDB helpers
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ColdCallerDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for offline data
      if (!db.objectStoreNames.contains('calls')) {
        db.createObjectStore('calls', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('leads')) {
        db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getOfflineData(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeOfflineData(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: data.data,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('❌ Push notification error:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Handle notification actions
  if (event.action) {
    console.log('📱 Notification action:', event.action);
  }
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll().then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Performance monitoring message handler
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_PERFORMANCE_METRICS') {
    event.ports[0].postMessage({
      type: 'PERFORMANCE_METRICS',
      metrics: performanceMetrics
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
    event.ports[0].postMessage({
      type: 'CACHE_CLEARED',
      success: true
    });
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName.startsWith(CACHE_PREFIX)) {
        console.log('🗑️ Clearing cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

// Periodic cleanup and optimization
setInterval(() => {
  // Clean up old cached entries
  cleanupOldCacheEntries();
  
  // Report performance metrics
  console.log('📊 Service Worker Performance:', performanceMetrics);
}, 300000); // Every 5 minutes

async function cleanupOldCacheEntries() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith(CACHE_PREFIX)) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // Remove entries older than 7 days
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader && new Date(dateHeader).getTime() < cutoffTime) {
            await cache.delete(request);
          }
        }
      }
    }
  }
}

console.log('🚀 Service Worker loaded successfully');