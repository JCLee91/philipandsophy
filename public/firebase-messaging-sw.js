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
 *
 * NOTE: onBackgroundMessage를 제거하여 FCM 자동 알림만 사용
 * FCM의 notification 필드를 사용하면 "from 앱이름" 없이 깔끔하게 표시됨
 * Service Worker에서 showNotification()을 호출하면 "from" 텍스트가 추가됨
 */
// messaging.onBackgroundMessage((payload) => {
//   // FCM이 자동으로 알림을 표시하므로 여기서는 처리하지 않음
// });

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
