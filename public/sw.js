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

const CACHE_NAME = 'philipandsophy-v4'; // Increment version to force update
const urlsToCache = [
  '/',
  '/app',
  '/image/favicon.webp',
];

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
 * Fetch event - network first, fallback to cache
 * Handles all network requests
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-HTTP(S) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Never cache API requests (always fetch fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network first, fallback to cache strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful GET requests
        if (event.request.method === 'GET' && response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
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
  console.log('[Unified SW] Message received from app:', event.data);

  // Handle SKIP_WAITING command (for SW updates)
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// PART 5: Service Worker Info
// ============================================

console.log('[Unified SW] Service Worker loaded successfully');
console.log('[Unified SW] Cache version:', CACHE_NAME);
console.log('[Unified SW] Firebase initialized for project:', firebase.app().options.projectId);
