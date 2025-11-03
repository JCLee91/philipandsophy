/**
 * Unified Service Worker for PWA + Firebase Cloud Messaging
 *
 * This service worker handles:
 * 1. PWA caching for offline support
 * 2. Firebase Cloud Messaging for push notifications
 *
 * Benefits of unified approach:
 * - No service worker scope conflicts
 * - Single registration point
 * - Better control over lifecycle
 * - iOS PWA compatible
 */

// ============================================
// PART 1: Firebase Cloud Messaging Setup
// ============================================

// Import Firebase scripts for FCM
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyCEFXW_Gvp_lJtYy35xe288ncvtfSHbFqY',
  authDomain: 'philipandsophy.firebaseapp.com',
  projectId: 'philipandsophy',
  storageBucket: 'philipandsophy.firebasestorage.app',
  messagingSenderId: '518153642299',
  appId: '1:518153642299:web:a6c0aa959b7cf9bc57571e',
});

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// ============================================
// PART 2: PWA Caching Setup
// ============================================

const CACHE_NAME = 'philipandsophy-v7'; // Increment version to force update

// ✅ 앱 셸 프리캐시 (초기 로딩 필수 리소스)
const urlsToCache = [
  '/',
  '/app',
  '/image/favicon.webp',
  '/image/logo_app.webp',
  '/image/app-icon-192.png',
  '/image/badge-icon.webp',
];

// ✅ 네비게이션 요청 감지 (HTML 페이지)
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// ============================================
// PART 3: Service Worker Lifecycle Events
// ============================================

/**
 * Install event - cache essential resources
 * Triggered when SW is first installed or updated
 */
self.addEventListener('install', (event) => {
  console.log('[Unified SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Unified SW] Caching essential resources');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Unified SW] Failed to cache resources:', error);
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 * Triggered when SW becomes active
 */
self.addEventListener('activate', (event) => {
  console.log('[Unified SW] Activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Unified SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );

  console.log('[Unified SW] Activated successfully');
});

/**
 * Fetch event - cache-first for navigation, network-first for others
 * Optimized for fast initial load
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-HTTP(S) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Never cache API requests (always fetch fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('[Unified SW] API fetch failed:', {
          url: event.request.url,
          method: event.request.method,
          error: error.message
        });
        return new Response(
          JSON.stringify({
            error: 'Network request failed',
            url: url.pathname
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // ✅ Cache-first for navigation requests (HTML pages)
  // 빠른 초기 로딩을 위해 캐시 우선, 백그라운드 업데이트
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // 캐시가 있으면 즉시 반환하고 백그라운드에서 업데이트
        if (cachedResponse) {
          console.log('[Unified SW] Cache-first: serving from cache:', event.request.url);

          // 백그라운드 업데이트 (await 없이)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {
              // 백그라운드 업데이트 실패는 무시
            });

          return cachedResponse;
        }

        // 캐시가 없으면 네트워크에서 가져오기
        console.log('[Unified SW] Cache miss: fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // 네트워크도 실패하면 기본 오프라인 페이지 (선택사항)
            return new Response(
              '<!DOCTYPE html><html><body><h1>오프라인 상태입니다</h1></body></html>',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              }
            );
          });
      })
    );
    return;
  }

  // ✅ Network-first for non-navigation requests (CSS, JS, images)
  // 최신 버전 우선, 실패 시 캐시 사용
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful GET requests
        if (event.request.method === 'GET' && response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache))
            .catch((error) => {
              console.warn('[Unified SW] Failed to cache response:', error);
            });
        }
        return response;
      })
      .catch((error) => {
        console.error('[Unified SW] Fetch failed:', error);
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Unified SW] Serving from cache (fallback):', event.request.url);
            return cachedResponse;
          }
          // No cache available
          console.error('[Unified SW] No cache available for:', event.request.url);
          return new Response(
            'Network error and no cached version available',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            }
          );
        });
      })
  );
});

// ============================================
// PART 4: Firebase Cloud Messaging Handlers
// ============================================

/**
 * Background message handling
 * FCM automatically displays notifications using the 'notification' field
 * No manual handling needed - this prevents "from 앱이름" text
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[Unified SW] Background message received:', payload);

  // Firebase automatically handles notification display
  // We just log it for debugging
});

/**
 * Handle notification click events
 * Opens the app or focuses existing window when user clicks notification
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Unified SW] Notification click received');

  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/app/chat';

  // Handle action buttons
  if (event.action === 'close') {
    return;
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // If no matching window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Handle push event (low-level push API)
 * This is automatically handled by Firebase Messaging
 */
self.addEventListener('push', (event) => {
  console.log('[Unified SW] Push event received');

  if (!event.data) {
    console.warn('[Unified SW] Push event received without data payload');
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch (error) {
    console.warn('[Unified SW] Failed to parse push payload as JSON', error);
    payload = {
      title: '필립앤소피',
      body: event.data.text(),
    };
  }

  // ✅ Data-only 메시지 파싱
  // FCM data-only: { data: { title, body, ... } }
  // Web Push: { title, body, data: { ... } }
  const messageData = payload?.data || {};

  const title = messageData?.title || payload?.title || '필립앤소피';
  const body = messageData?.body || payload?.body || '';
  const icon = messageData?.icon || payload?.icon || '/image/app-icon-192.png';
  const badge = messageData?.badge || payload?.badge || '/image/badge-icon.webp';
  const url = messageData?.url || payload?.url || '/app';
  const type = messageData?.type || payload?.type || 'general';
  const tag = messageData?.tag || payload?.tag;

  console.log('[Unified SW] Showing notification (data-only message)', {
    title,
    type,
    tag,
    hasData: !!messageData,
  });

  const options = {
    body,
    icon,
    badge,
    data: {
      url,
      type,
    },
    tag,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Handle message events from the main app
 * Allows communication between app and service worker
 */
self.addEventListener('message', (event) => {
  // Only log important messages, not Firebase Auth storage events
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Unified SW] SKIP_WAITING command received');
    self.skipWaiting();
  }
  // Skip logging Firebase Auth localStorage events (too noisy)
  // They have eventType: 'keyChanged' and key starting with 'firebase:'
});

// ============================================
// PART 5: Service Worker Info
// ============================================

console.log('[Unified SW] Service Worker loaded successfully');
console.log('[Unified SW] Cache version:', CACHE_NAME);
console.log('[Unified SW] Firebase initialized for project:', firebase.app().options.projectId);
