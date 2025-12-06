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

const CACHE_NAME = 'philipandsophy-v13'; // v13: No navigation caching (industry standard for realtime apps)

// ✅ 정적 자산만 프리캐시 (HTML 페이지는 캐싱 안 함)
const urlsToCache = [
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
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
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
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

  // Skip external image domains (Naver book covers)
  const externalImageDomains = [
    'shopping-phinf.pstatic.net',
    'bookthumb-phinf.pstatic.net',
  ];
  if (externalImageDomains.some(domain => url.hostname.includes(domain))) {
    return; // Let browser handle it directly
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

  // ✅ Navigation 요청은 서비스 워커가 개입하지 않음 (업계 표준)
  // 실시간 데이터 앱에서는 HTML을 캐싱하지 않고 항상 서버에서 가져옴
  if (isNavigationRequest(event.request)) {
    return; // 브라우저가 알아서 처리
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
            .catch(() => {
              // 캐시 실패 무시
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // No cache available
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
  // Firebase automatically handles notification display
});

/**
 * Handle notification click events
 * Opens the app or focuses existing window when user clicks notification
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/app/chat';

  // Handle action buttons
  if (event.action === 'close') {
    // ✅ 닫기 버튼 클릭 시에도 배지 제거
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge();
    }
    return;
  }

  // ✅ 알림 클릭 시 앱 아이콘 배지 제거
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge();
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
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch (error) {
    const text = event.data.text();
    
    // 텍스트도 없으면 무시
    if (!text || text.trim() === '') {
      return;
    }

    payload = {
      title: '필립앤소피',
      body: text,
    };
  }

  // ✅ Data-only 메시지 파싱
  // FCM data-only: { data: { title, body, ... } }
  // Web Push: { title, body, data: { ... } }
  const messageData = payload?.data || {};

  // 1. 유효성 검사: 제목과 내용이 모두 없는 경우 무시 (Firebase 내부 메시지 등)
  const rawTitle = messageData?.title || payload?.title;
  const rawBody = messageData?.body || payload?.body;

  if (!rawTitle && !rawBody) {
    console.log('[SW] Ignoring push message with no title and body');
    return;
  }

  const title = rawTitle || '필립앤소피';
  const body = rawBody || '';
  const icon = messageData?.icon || payload?.icon || '/image/app-icon-192.png';
  const badge = messageData?.badge || payload?.badge || '/image/badge-icon.webp';
  const url = messageData?.url || payload?.url || '/app';
  const type = messageData?.type || payload?.type || 'general';
  const tag = messageData?.tag || payload?.tag;

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
    (async () => {
      // 알림 표시
      await self.registration.showNotification(title, options);

      // ✅ 앱 아이콘 배지 표시 (읽지 않은 알림 있음)
      try {
        if ('setAppBadge' in navigator) {
          await navigator.setAppBadge(1);
        }
      } catch (error) {
        console.error('[SW] Failed to set app badge:', error);
      }
    })()
  );
});

/**
 * Handle message events from the main app
 * Allows communication between app and service worker
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // ✅ 특정 타입의 알림들을 모두 제거
  // 사용자가 앱 내에서 공지/DM 페이지로 이동했을 때 알림센터의 알림을 제거
  if (event.data && event.data.type === 'CLEAR_NOTIFICATIONS_BY_TYPE') {
    const notificationType = event.data.notificationType; // 'notice', 'dm', 'matching'

    event.waitUntil(
      self.registration.getNotifications().then((notifications) => {
        let closedCount = 0;
        notifications.forEach((notification) => {
          // notification.data.type이 매칭되면 닫기
          if (notification.data?.type === notificationType) {
            notification.close();
            closedCount++;
          }
        });
        console.log(`[SW] Closed ${closedCount} notifications of type: ${notificationType}`);
      })
    );
  }
});
