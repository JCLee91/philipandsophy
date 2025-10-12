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

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'DΩdå<';
  const notificationOptions = {
    body: payload.notification?.body || '»\¥ Lºt ƒ)àµ»‰',
    icon: payload.notification?.icon || '/image/favicon.webp',
    badge: '/image/favicon.webp',
    tag: payload.data?.type || 'general',
    data: payload.data || {},
    requireInteraction: false,
    // Actions for interactive notifications
    actions: payload.data?.type === 'dm' ? [
      {
        action: 'open',
        title: 'UxX0',
      },
      {
        action: 'close',
        title: 'Î0',
      }
    ] : undefined,
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
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
