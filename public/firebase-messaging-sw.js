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
 * Background message handling
 *
 * FCM automatically displays notifications when using the 'notification' field.
 * No manual handling needed - this prevents "from 앱이름" text from appearing.
 */

/**
 * Standard Web Push API handler (iOS Safari + All Platforms)
 *
 * Handles both FCM messages and standard Web Push messages.
 * Works for iOS Safari PWA, Android, and Desktop browsers.
 */
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received', event);

  try {
    // Parse push data
    const data = event.data ? event.data.json() : {};

    // Extract notification content (works for both FCM and Web Push)
    const title = data.notification?.title || data.title || '필립앤소피';
    const options = {
      body: data.notification?.body || data.body || '',
      icon: data.notification?.icon || data.icon || '/image/app-icon-192.png',
      badge: '/image/badge-icon.webp',
      tag: data.tag || 'default',
      data: data.data || data,
      requireInteraction: false,
      silent: false,
    };

    // Show notification
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error handling push event', error);
  }
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
