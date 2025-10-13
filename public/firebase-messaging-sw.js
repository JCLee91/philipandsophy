/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for PWA
 *
 * This file must be in the public/ folder and will be served at /firebase-messaging-sw.js
 */

// Import Firebase scripts using importScripts (required for service workers)
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

/**
 * Handle background messages (when app is not in focus)
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Extract notification data from data field (not notification field)
  // title 없이 body만 사용 (manifest.json의 short_name이 자동으로 표시됨)
  const notificationOptions = {
    body: payload.data?.body || '새 알림이 도착했습니다',
    icon: '/image/favicon.webp',
    badge: '/image/favicon.webp',
    tag: payload.data?.type || 'general',
    data: payload.data || {},
    requireInteraction: false,
    // Actions for interactive notifications
    actions: payload.data?.type === 'dm' ? [
      {
        action: 'open',
        title: '열기',
      },
      {
        action: 'close',
        title: '닫기',
      }
    ] : undefined,
  };

  // Show notification (첫 번째 인자는 빈 문자열로 - manifest name이 표시됨)
  return self.registration.showNotification('', notificationOptions);
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

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
 */
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received', event);

  // Firebase Messaging handles this automatically with onBackgroundMessage
  // This is just for logging and debugging
});

/**
 * Service Worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});

/**
 * Service Worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});
