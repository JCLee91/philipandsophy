# iOS PWA Web Push Implementation Guide

**Last Updated**: 2025-11-04
**Document Version**: 1.1.0
**Difficulty**: ⭐⭐⭐⭐⭐ Expert Level
**Status**: ✅ Production Ready (프로덕션 배포 완료)

---

## 📚 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Critical iOS PWA Challenges Solved](#critical-ios-pwa-challenges-solved)
4. [Database Schema](#database-schema)
5. [Implementation Details](#implementation-details)
6. [Environment Variables](#environment-variables)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Executive Summary

This document details our **dual-strategy push notification system** that successfully works on both iOS Safari PWA (Web Push API) and Android/Desktop Chrome (Firebase Cloud Messaging). This was an extremely challenging implementation requiring deep understanding of iOS PWA limitations and workarounds.

### Why Dual-Strategy?

**Challenge**: iOS Safari does NOT support Firebase Cloud Messaging (FCM).

**Solution**: We implemented two parallel push systems:
- **FCM** for Android Chrome, Desktop Chrome/Edge/Firefox
- **Web Push API** for iOS Safari PWA (and as fallback for all browsers)

### Key Achievement

We solved the iOS Safari PWA push notification problem, which is notoriously difficult due to:
- Service Worker registration timing issues
- localStorage failures in Private Mode
- Inconsistent permission states
- `navigator.serviceWorker.ready` infinite hangs
- next-pwa overwriting custom Service Workers

---

## Architecture Overview

### System Architecture Diagram

```mermaid
graph TD
    A[User Device] --> B{Platform Detection}
    B -->|iOS Safari PWA| C[Web Push API]
    B -->|Android Chrome| D[FCM]
    B -->|Desktop Chrome/Edge| E[FCM + Web Push]

    C --> F[Service Worker]
    D --> F
    E --> F

    F --> G[Unified SW /sw.js]
    G --> H[Push Event Handler]

    H --> I{Storage Strategy}
    I -->|FCM Token| J[pushTokens Array]
    I -->|Web Push| K[webPushSubscriptions Array]

    J --> L[Firestore participants/]
    K --> L

    L --> M[Server-side Push]
    M --> N[Apple Push Service]
    M --> O[FCM Cloud]

    N --> P[iOS Device]
    O --> Q[Android/Desktop]
```

### Platform-Specific Behavior

| Platform | FCM Support | Web Push Support | Strategy |
|----------|-------------|------------------|----------|
| **iOS Safari PWA** | ❌ No | ✅ Yes | Web Push only |
| **Android Chrome** | ✅ Yes | ✅ Yes | Dual (FCM primary) |
| **Desktop Chrome** | ✅ Yes | ✅ Yes | Dual (FCM primary) |
| **Desktop Safari** | ❌ No | ✅ Yes | Web Push only |
| **Firefox** | ✅ Yes | ✅ Yes | Dual (FCM primary) |

### Why Both Methods?

1. **Reliability**: If one system fails, the other can still deliver notifications
2. **Platform Coverage**: iOS Safari requires Web Push, Android prefers FCM
3. **Redundancy**: Multi-device support benefits from both systems
4. **Future-Proof**: Web Push API is becoming standard across all browsers

---

## Critical iOS PWA Challenges Solved

### Challenge 1: Service Worker Registration Timing

**Problem**: iOS PWA doesn't trigger `window.onload` when opened from home screen.

**Initial Approach** (FAILED):
```typescript
// ❌ This doesn't work on iOS PWA
window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js');
});
```

**Solution** (SUCCESS):
```typescript
// ✅ Register immediately on script execution
// File: src/app/register-sw.tsx (line 156)
useEffect(() => {
  registerUnifiedServiceWorker(); // Called immediately, not on 'load'
}, []);
```

**Key Insight**: iOS PWA is already "loaded" when opened from home screen. We must register the Service Worker immediately in `useEffect`, not wait for `load` event.

---

### Challenge 2: next-pwa Overwriting Custom Service Worker

**Problem**: next-pwa plugin was generating its own SW that overwrote our FCM-enabled custom SW.

**Initial Approach** (FAILED):
```typescript
// ❌ next.config.ts with next-pwa
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});
```

**Solution** (SUCCESS):
```typescript
// ✅ next.config.ts (line 58-61)
// We're NOT using next-pwa anymore - it was overwriting our custom SW
// Instead, we maintain public/sw.js manually (copied from worker/index.js)
// This ensures FCM initialization and push handlers are preserved
export default nextConfig;
```

**Key Files**:
- `public/sw.js` - Our unified Service Worker (manually maintained)
- `src/app/register-sw.tsx` - Registration component
- No next-pwa dependency

---

### Challenge 3: localStorage Failures in iOS Safari Private Mode

**Problem**: iOS Safari Private Mode throws errors when accessing `localStorage`.

**Initial Approach** (FAILED):
```typescript
// ❌ Crashes in Private Mode
function getDeviceId() {
  const existingId = localStorage.getItem('device-id');
  if (existingId) return existingId;
  // ...
}
```

**Solution** (SUCCESS):
```typescript
// ✅ File: src/lib/firebase/messaging.ts (line 42-50, 69-78)
function generateDeviceId() {
  try {
    const existingId = localStorage.getItem('device-id');
    if (existingId) return existingId;
  } catch (error) {
    // Safari Private Mode에서 localStorage 읽기 실패 시 계속 진행
    logger.warn('localStorage read failed (Safari Private Mode?)', { error });
  }

  // Generate fingerprint-based ID
  const deviceId = `${Date.now()}-${hash}-${random}`;

  try {
    localStorage.setItem('device-id', deviceId);
  } catch (error) {
    // Safari Private Mode에서 쓰기 실패 시 경고만 출력
    logger.warn('localStorage write failed, device ID will regenerate on reload');
  }

  return deviceId;
}
```

**Key Insight**: Wrap ALL `localStorage` access in try-catch blocks. Gracefully degrade when unavailable.

---

### Challenge 4: navigator.serviceWorker.ready Infinite Hang

**Problem**: `navigator.serviceWorker.ready` sometimes hangs forever on iOS Safari PWA.

**Initial Approach** (FAILED):
```typescript
// ❌ Can hang indefinitely
async function getCurrentWebPushSubscription() {
  const registration = await navigator.serviceWorker.ready; // Hangs!
  return await registration.pushManager.getSubscription();
}
```

**Solution** (SUCCESS):
```typescript
// ✅ File: src/lib/firebase/webpush.ts (line 184-205)
export async function getCurrentWebPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isWebPushSupported()) return null;

    // ✅ 5초 타임아웃 추가 (무한 대기 방지)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Service Worker ready timeout (5s)')), 5000);
    });

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      timeoutPromise
    ]);

    return await registration.pushManager.getSubscription();
  } catch (error) {
    logger.warn('Cannot get Web Push subscription (timeout or error)', error);
    return null;
  }
}
```

**Also Applied In**:
- `src/lib/firebase/messaging.ts` (line 139-167) - `ensureServiceWorkerReady()`
- `src/app/register-sw.tsx` (line 26-68) - `waitForController()`

**Key Insight**: ALWAYS use `Promise.race()` with timeout when calling `navigator.serviceWorker.ready` on iOS.

---

### Challenge 5: Permission State Inconsistencies

**Problem**: iOS Safari PWA resets `Notification.permission` to `'default'` even after being granted.

**Initial Approach** (FAILED):
```typescript
// ❌ Unreliable on iOS
if (Notification.permission !== 'granted') {
  // Disable notifications
  await cleanupTokens();
}
```

**Solution** (SUCCESS):
```typescript
// ✅ File: src/components/NotificationToggle.tsx (line 67-132)
const checkNotificationStatus = async (participantId: string) => {
  // 1. Get Firestore data (Single Source of Truth)
  const data = participantSnap.data();

  // 2. Check Web Push subscription (endpoint-based, more reliable)
  const subscription = await getCurrentWebPushSubscription();

  if (subscription) {
    // Use endpoint (stable) instead of deviceId (unstable)
    isPushEnabled = isPushEnabledForEndpoint(data, subscription.endpoint);
  }

  // 3. Only cleanup if EXPLICITLY denied (not 'default')
  const browserPermission = getNotificationPermission();
  if (isPushEnabled && browserPermission === 'denied') {
    await removePushTokenFromFirestore(participantId);
  }
}
```

**Key Strategy**:
1. **Firestore is Single Source of Truth** - Don't rely on browser permission state
2. **endpoint-based checking** - Use Web Push `subscription.endpoint` instead of `deviceId`
3. **Only cleanup on explicit denial** - Ignore `'default'` state (iOS bug)

---

### Challenge 6: Endpoint-Based Token Management (No localStorage Dependency)

**Problem**: `deviceId` based on localStorage is unreliable in iOS Safari Private Mode.

**Solution**: Use Web Push `endpoint` as the unique identifier.

```typescript
// ✅ File: src/lib/push/helpers.ts (line 194-212)
export function isPushEnabledForEndpoint(data: any, endpoint: string): boolean {
  if (!endpoint) return false;
  if (data.pushNotificationEnabled === false) return false;

  const webPushSubs: WebPushSubscriptionData[] =
    Array.isArray(data.webPushSubscriptions) ? data.webPushSubscriptions : [];

  return webPushSubs.some(
    (sub) => sub.endpoint === endpoint &&
             typeof sub.endpoint === 'string' &&
             sub.endpoint.trim().length > 0
  );
}
```

**Benefits**:
- **No localStorage dependency** - Works in Private Mode
- **Browser-generated** - Endpoint is stable and unique
- **Perfect for iOS Safari PWA** - Most reliable identifier

---

## Database Schema

### Firestore Collection: `participants/{participantId}`

```typescript
interface Participant {
  // ... other fields ...

  // Push Notification Fields
  pushNotificationEnabled?: boolean;        // User preference (default: false)

  // FCM Tokens (Android/Desktop Chrome/Edge/Firefox)
  pushTokens?: PushTokenEntry[];           // Multi-device FCM tokens
  pushToken?: string;                      // DEPRECATED: Legacy single token
  pushTokenUpdatedAt?: Timestamp;          // DEPRECATED: Use pushTokens[].updatedAt

  // Web Push Subscriptions (iOS Safari + All Platforms)
  webPushSubscriptions?: WebPushSubscriptionData[];  // Standard Web Push API
}
```

### PushTokenEntry (FCM)

```typescript
// File: src/types/database.ts (line 78-84)
interface PushTokenEntry {
  deviceId: string;        // Browser fingerprint
  token: string;           // FCM push token
  updatedAt: Timestamp;    // Last refresh time
  userAgent?: string;      // Device identification
  lastUsedAt?: Timestamp;  // Last notification sent
}
```

**Example**:
```javascript
{
  pushTokens: [
    {
      deviceId: "1729234567890-123456789-abc123",
      token: "eXg4aDNm...", // FCM token
      updatedAt: Timestamp(2025, 10, 21, 12, 30),
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/118.0.0.0",
      lastUsedAt: Timestamp(2025, 10, 21, 12, 35)
    },
    {
      deviceId: "1729234999999-987654321-xyz789",
      token: "dGhpcyB...",
      updatedAt: Timestamp(2025, 10, 20, 15, 20),
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0.0.0"
    }
  ]
}
```

---

### WebPushSubscriptionData (Web Push)

```typescript
// File: src/types/database.ts (line 89-99)
interface WebPushSubscriptionData {
  endpoint: string;        // Push endpoint (https://web.push.apple.com/...)
  keys: {
    p256dh: string;        // Public key for encryption
    auth: string;          // Auth secret for encryption
  };
  deviceId: string;        // Browser fingerprint
  userAgent: string;       // Device identification
  createdAt: Date | Timestamp;    // Subscription created
  lastUsedAt?: Date | Timestamp;  // Last notification sent
}
```

**Example**:
```javascript
{
  webPushSubscriptions: [
    {
      endpoint: "https://web.push.apple.com/QHBf...",
      keys: {
        p256dh: "BEl62...",
        auth: "tBHIt..."
      },
      deviceId: "1729234567890-123456789-abc123",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
      createdAt: Timestamp(2025, 10, 21, 10, 15),
      lastUsedAt: Timestamp(2025, 10, 21, 12, 30)
    }
  ]
}
```

---

### Schema Evolution & Migration

#### Legacy Fields (DEPRECATED)

```typescript
// ❌ Old approach (single device only)
pushToken: "eXg4aDNm...",              // Single FCM token
pushTokenUpdatedAt: Timestamp(...),    // Last update

// ✅ New approach (multi-device support)
pushTokens: [{ deviceId, token, updatedAt }],
webPushSubscriptions: [{ endpoint, keys, deviceId }]
```

#### Migration Strategy

The system supports both old and new schema:

```typescript
// File: src/lib/push/helpers.ts (line 29-55)
export function hasAnyPushSubscription(data: any): boolean {
  // Priority 1: Check modern arrays
  const hasMultiDeviceToken =
    Array.isArray(data.pushTokens) && data.pushTokens.some(entry => entry?.token);
  const hasWebPushSubscription =
    Array.isArray(data.webPushSubscriptions) && data.webPushSubscriptions.some(sub => sub?.endpoint);

  // Priority 2: Fallback to legacy field (backward compatibility)
  const arraysExist =
    (Array.isArray(data.pushTokens) && data.pushTokens.length > 0) ||
    (Array.isArray(data.webPushSubscriptions) && data.webPushSubscriptions.length > 0);
  const hasLegacyToken = !arraysExist && typeof data.pushToken === 'string';

  return hasMultiDeviceToken || hasWebPushSubscription || hasLegacyToken;
}
```

**Key Principles**:
1. **Read both** - Support legacy data during transition
2. **Write new** - Always write to modern arrays
3. **Ignore legacy if arrays exist** - Once migrated, legacy data is ignored

---

## Implementation Details

### File Structure

```
src/
├── app/
│   ├── register-sw.tsx              # Service Worker registration
│   └── providers.tsx                # Firebase initialization
├── lib/
│   ├── firebase/
│   │   ├── messaging.ts             # FCM token management
│   │   ├── webpush.ts               # Web Push utilities
│   │   └── client.ts                # Firestore client
│   ├── push/
│   │   └── helpers.ts               # Platform-agnostic push utilities
│   └── logger.ts                    # Logging utility
├── components/
│   └── NotificationToggle.tsx       # UI for enabling/disabling push
└── types/
    └── database.ts                  # TypeScript types

public/
└── sw.js                            # Unified Service Worker (FCM + PWA)

next.config.ts                       # NO next-pwa (removed!)
```

---

### 1. Unified Service Worker (`public/sw.js`)

This is the heart of the system. It handles:
- PWA caching for offline support
- FCM background message handling
- Web Push event handling
- Notification click events

```javascript
// File: public/sw.js (line 1-288)

// ============================================
// PART 1: Firebase Cloud Messaging Setup
// ============================================
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCEFXW_Gvp_lJtYy35xe288ncvtfSHbFqY',
  authDomain: 'philipandsophy.firebaseapp.com',
  projectId: 'philipandsophy',
  storageBucket: 'philipandsophy.firebasestorage.app',
  messagingSenderId: '518153642299',
  appId: '1:518153642299:web:a6c0aa959b7cf9bc57571e',
});

const messaging = firebase.messaging();

// ============================================
// PART 2: PWA Caching Setup
// ============================================
const CACHE_NAME = 'philipandsophy-v3';
const urlsToCache = ['/', '/app', '/image/favicon.webp'];

// ============================================
// PART 3: Service Worker Lifecycle Events
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // Force update
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        }))
      ),
      self.clients.claim(), // Take control immediately
    ])
  );
});

// ============================================
// PART 4: Push Event Handler (Web Push API)
// ============================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    payload = { title: '필립앤소피', body: event.data.text() };
  }

  // FCM auto notification이 이미 표시된 경우 중복 방지
  if (payload?.notification && payload?.from) {
    console.log('Skipping push display (handled by FCM auto notification)');
    return;
  }

  const title = payload?.title || payload?.notification?.title || '필립앤소피';
  const body = payload?.body || payload?.notification?.body || '';
  const icon = payload?.icon || payload?.notification?.icon || '/image/app-icon-192.png';
  const url = payload?.data?.url || payload?.url || '/app';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/image/badge-icon.webp',
      data: { url },
    })
  );
});

// ============================================
// PART 5: Notification Click Handler
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/app/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
```

**Critical Details**:

1. **Lines 20-31**: Firebase initialization with your project credentials
2. **Line 70**: `self.skipWaiting()` - Forces immediate activation of updated SW
3. **Line 94**: `self.clients.claim()` - Takes control of all pages immediately
4. **Lines 213-217**: Prevents duplicate notifications when FCM auto-displays
5. **Lines 158-187**: Handles notification clicks and opens/focuses app

---

### 2. Service Worker Registration (`src/app/register-sw.tsx`)

Handles SW registration with iOS PWA optimizations.

```typescript
// File: src/app/register-sw.tsx (line 70-169)

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported');
      return;
    }

    let updateIntervalId: NodeJS.Timeout | null = null;

    const registerUnifiedServiceWorker = async () => {
      try {
        // Step 1: Check for existing registration (reuse if available)
        let registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
          logger.info('Service worker already registered', {
            scope: registration.scope,
            state: registration.active?.state || 'no active worker',
          });
        } else {
          // Step 2: Register new SW
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          logger.info('Service worker registered successfully');
        }

        // Step 3: Wait for controller (iOS optimization)
        await waitForController(5000);
        logger.info('Service worker controller ready');

        // Step 4: Update check listener
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('New service worker installed, waiting for activation');
              }
            });
          }
        });

        // Step 5: Periodic update check (1 hour)
        updateIntervalId = setInterval(() => {
          logger.info('Checking for service worker updates...');
          registration.update();
        }, 60 * 60 * 1000);
      } catch (error) {
        logger.error('Failed to register service worker', error);
      }
    };

    // ✅ Register immediately (not on 'load' event)
    registerUnifiedServiceWorker();

    // Cleanup
    return () => {
      if (updateIntervalId) clearInterval(updateIntervalId);
    };
  }, []);

  return null;
}
```

**Key Points**:

1. **Line 156**: Registers immediately, not waiting for `load` event (iOS PWA fix)
2. **Line 94**: Reuses existing registration instead of re-registering
3. **Line 121**: Waits for controller with timeout (prevents hang)
4. **Line 145**: Periodic update check every hour
5. **Line 159-165**: Cleanup on unmount (prevents memory leaks)

---

### 3. Web Push Utilities (`src/lib/firebase/webpush.ts`)

Platform-agnostic Web Push API utilities.

```typescript
// File: src/lib/firebase/webpush.ts (line 21-33)

/**
 * Convert base64 VAPID key to Uint8Array
 * Required for pushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

```typescript
// File: src/lib/firebase/webpush.ts (line 93-130)

/**
 * Create Web Push subscription
 */
export async function createWebPushSubscription(
  vapidKey: string
): Promise<PushSubscription | null> {
  try {
    if (!isWebPushSupported()) {
      logger.warn('Web Push not supported');
      return null;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      logger.info('Already subscribed to Web Push');
      return existingSubscription;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    logger.info('Created Web Push subscription', {
      endpoint: subscription.endpoint,
    });

    return subscription;
  } catch (error) {
    logger.error('Error creating Web Push subscription', error);
    return null;
  }
}
```

**Critical Functions**:

1. **urlBase64ToUint8Array**: Converts VAPID key format (required by spec)
2. **isFCMSupported**: Async check using Firebase's official `isSupported()`
3. **createWebPushSubscription**: Creates standard Web Push subscription
4. **getCurrentWebPushSubscription**: Gets subscription with timeout (iOS fix)

---

### 4. Push Notification Management (`src/lib/firebase/messaging.ts`)

Core logic for FCM + Web Push dual-strategy.

```typescript
// File: src/lib/firebase/messaging.ts (line 556-676)

/**
 * Initialize push notifications (Dual-path: FCM + Web Push)
 */
export async function initializePushNotifications(
  messaging: Messaging | null,
  participantId: string
): Promise<{ token: string; cleanup: () => void } | null> {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      logger.warn('Push notifications not supported on this device');
      return null;
    }

    // Request permission
    const permission = getNotificationPermission();
    if (permission === 'denied') return null;
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') return null;
    }

    const deviceId = getDeviceId();
    let token: string | null = null;
    let cleanup: (() => void) | null = null;

    // Check platform support
    const fcmSupported = await isFCMSupported();
    const webPushSupported = isWebPushSupported();

    // ✅ Strategy 1: Try FCM (Android/Desktop Chrome/Edge/Firefox)
    if (fcmSupported && messaging) {
      logger.info('Platform supports FCM, using FCM token');
      token = await getFCMToken(messaging);
      if (token) {
        await savePushTokenToFirestore(participantId, token);
        cleanup = setupForegroundMessageHandler(messaging);
        logger.info('FCM push notifications initialized');
      }
    }

    // ✅ Strategy 2: Try Web Push (iOS Safari + All Platforms)
    if (webPushSupported) {
      logger.info('Platform supports Web Push, subscribing to Web Push');
      const vapidKey = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_KEY;
      if (!vapidKey) {
        logger.error('Web Push VAPID key not found');
      } else {
        const subscription = await createWebPushSubscription(vapidKey);
        if (subscription) {
          // Save to Firestore via API route
          const headers = await buildAuthorizedJsonHeaders();
          if (headers) {
            const response = await fetch('/api/push-subscriptions', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                participantId,
                subscription: subscription.toJSON(),
                deviceId,
              }),
            });

            if (response.ok) {
              logger.info('Web Push subscription saved');
              if (!token) token = subscription.endpoint; // Fallback
            }
          }
        }
      }
    }

    // ✅ Result
    if (!token) {
      logger.error('Failed to initialize any push notification method');
      return null;
    }

    logger.info('Push notifications initialized (dual-path)', {
      participantId,
      deviceId,
      hasFCM: fcmSupported,
      hasWebPush: webPushSupported,
    });

    return { token, cleanup: cleanup || (() => {}) };
  } catch (error) {
    logger.error('Error initializing push notifications', error);
    return null;
  }
}
```

**Flow**:

1. **Lines 567-582**: Permission checks and request
2. **Lines 589-602**: Try FCM first (skipped on Safari)
3. **Lines 605-652**: Try Web Push (works everywhere)
4. **Lines 655-671**: Return result with cleanup function

---

### 5. Platform-Agnostic Helpers (`src/lib/push/helpers.ts`)

Server-safe utilities for push status detection.

```typescript
// File: src/lib/push/helpers.ts (line 29-55)

/**
 * Check if participant has any valid push subscription
 */
export function hasAnyPushSubscription(data: any): boolean {
  // Priority 1: Check modern arrays first
  const hasMultiDeviceToken =
    Array.isArray(data.pushTokens) &&
    data.pushTokens.some(
      (entry: any) => typeof entry?.token === 'string' && entry.token.trim().length > 0
    );

  const hasWebPushSubscription =
    Array.isArray(data.webPushSubscriptions) &&
    data.webPushSubscriptions.some(
      (sub: any) => typeof sub?.endpoint === 'string' && sub.endpoint.trim().length > 0
    );

  // Priority 2: Fallback to legacy field (backward compatibility)
  const arraysExist =
    (Array.isArray(data.pushTokens) && data.pushTokens.length > 0) ||
    (Array.isArray(data.webPushSubscriptions) && data.webPushSubscriptions.length > 0);
  const hasLegacyToken =
    !arraysExist && typeof data.pushToken === 'string' && data.pushToken.trim().length > 0;

  return hasMultiDeviceToken || hasWebPushSubscription || hasLegacyToken;
}
```

```typescript
// File: src/lib/push/helpers.ts (line 194-212)

/**
 * Check if push is enabled for specific Web Push endpoint
 * More reliable than deviceId (no localStorage dependency)
 */
export function isPushEnabledForEndpoint(data: any, endpoint: string): boolean {
  if (!endpoint) return false;
  if (data.pushNotificationEnabled === false) return false;

  const webPushSubs: WebPushSubscriptionData[] = Array.isArray(data.webPushSubscriptions)
    ? data.webPushSubscriptions
    : [];

  return webPushSubs.some(
    (sub) => sub.endpoint === endpoint &&
             typeof sub.endpoint === 'string' &&
             sub.endpoint.trim().length > 0
  );
}
```

**Why These Helpers?**:

1. **Server-Safe**: No `'use client'` directive, can be used in API routes
2. **Single Source of Truth**: Always check Firestore data
3. **Platform-Agnostic**: Works for both FCM and Web Push
4. **Migration-Friendly**: Handles legacy and modern schema

---

### 6. UI Component (`src/components/NotificationToggle.tsx`)

User-facing toggle for enabling/disabling push notifications.

```typescript
// File: src/components/NotificationToggle.tsx (line 67-132)

const checkNotificationStatus = async (participantId: string) => {
  try {
    setIsStatusLoading(true);

    // 1. Get Firestore participant data (Single Source of Truth)
    const participantRef = doc(getDb(), 'participants', participantId);
    const participantSnap = await getDoc(participantRef);
    if (!participantSnap.exists()) {
      setIsEnabled(false);
      return;
    }
    const data = participantSnap.data();

    // 2. ✅ Check Web Push subscription (endpoint-based)
    const subscription = await getCurrentWebPushSubscription();
    let isPushEnabled = false;

    if (subscription) {
      // Use endpoint (stable, no localStorage dependency)
      isPushEnabled = isPushEnabledForEndpoint(data, subscription.endpoint);
      logger.info('Status check result (Web Push)', {
        participantId,
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        isPushEnabled,
      });
    } else {
      // Fallback to FCM deviceId
      const deviceId = getDeviceId();
      isPushEnabled = isPushEnabledForDevice(data, deviceId);
      logger.info('Status check result (FCM fallback)', {
        participantId,
        deviceId,
        isPushEnabled,
      });
    }

    // 3. Update UI state
    setIsEnabled(isPushEnabled);

    // 4. Check browser permission (reference only)
    const browserPermission = getNotificationPermission();

    // 5. ✅ Only cleanup if EXPLICITLY denied (not 'default')
    if (isPushEnabled && browserPermission === 'denied') {
      logger.warn('Permission explicitly denied. Cleaning up...');
      await removePushTokenFromFirestore(participantId);
      setIsEnabled(false);
    }
  } catch (error) {
    logger.error('Error checking notification status', error);
  } finally {
    setIsStatusLoading(false);
  }
};
```

**Key Decisions**:

1. **Line 73**: Firestore is Single Source of Truth, not browser state
2. **Line 84-91**: Prioritize Web Push endpoint over deviceId (iOS fix)
3. **Line 112-119**: Only cleanup on explicit `'denied'`, not `'default'` (iOS bug)
4. **Line 33**: Separate loading state for initial check vs user action

---

## Environment Variables

### Required Environment Variables

Create `.env.local` file with these variables:

```bash
# ============================================
# Firebase Configuration (Client-Side)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCEFXW_Gvp_lJtYy35xe288ncvtfSHbFqY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=philipandsophy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=philipandsophy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=philipandsophy.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=518153642299
NEXT_PUBLIC_FIREBASE_APP_ID=1:518153642299:web:a6c0aa959b7cf9bc57571e

# ============================================
# FCM VAPID Key (for getToken - Android/Desktop)
# ============================================
# Get from Firebase Console: Project Settings > Cloud Messaging > Web Push certificates
NEXT_PUBLIC_FCM_VAPID_KEY=BNrl2wjTDPpeSG2d8oIHzz5sfvOkeCXSpqjlldrZz1d1AqsvbBlFezEXLKk2Ewkpfj3nq5Y8Qt6IvyoxzoOyhQg

# ============================================
# Web Push VAPID Keys (for iOS Safari PWA + All Platforms)
# ============================================
# Public key (client-side) - Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_WEBPUSH_VAPID_KEY=BLuDF-xf1T6QMG0p_gZbYq1CSps7cK2zXp8KFIQ6jqg_6bJQFneMoG6CK0WDEQSkUSynUTgZJnxdhxvu67Fz2LY

# Private key (server-side ONLY - DO NOT expose to client)
WEBPUSH_VAPID_PRIVATE_KEY=tLN-WnLtCrKKj5ShI9PnJgEgtd5dX2WMNc2v2DB0hRY
```

**⚠️ Security Warning**:
- `WEBPUSH_VAPID_PRIVATE_KEY` is **server-side only**
- Never add `NEXT_PUBLIC_` prefix to private keys
- Firebase FCM VAPID and Web Push VAPID are **different keys**
- Current setup uses **different VAPID keys** for FCM and Web Push (recommended)

### Generating VAPID Keys

**Method 1: Use Firebase Console** (Recommended)

1. Go to Firebase Console → Your Project
2. Project Settings → Cloud Messaging
3. Web Push certificates section
4. Click "Generate key pair"
5. Copy the key and set as `NEXT_PUBLIC_FCM_VAPID_KEY`

**Method 2: Generate Your Own** (Advanced)

```bash
# Install web-push CLI
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# Public Key: BEl62...
# Private Key: tBHIt...

# Set Public Key as NEXT_PUBLIC_WEBPUSH_VAPID_KEY
# Store Private Key securely (needed for sending notifications)
```

---

### Server-Side Environment Variables

For sending push notifications from your backend:

```bash
# ============================================
# Server-Side (API Routes / Backend)
# ============================================

# Web Push Private Key (DO NOT expose to client!)
WEBPUSH_PRIVATE_KEY=your_private_key_here

# Firebase Admin SDK (for server-side FCM)
FIREBASE_ADMIN_PROJECT_ID=philipandsophy
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@philipandsophy.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Testing Guide

### Testing Matrix

| Test Case | iOS Safari PWA | Android Chrome | Desktop Safari |
|-----------|----------------|----------------|----------------|
| Enable Notifications | ✅ Web Push | ✅ FCM + Web Push | ✅ Web Push |
| Receive Background Push | ✅ Test | ✅ Test | ✅ Test |
| Receive Foreground Push | ✅ Test | ✅ Test | ✅ Test |
| Notification Click | ✅ Test | ✅ Test | ✅ Test |
| Multi-Device | ✅ Test | ✅ Test | ✅ Test |
| Private Mode | ✅ Test | ✅ Test | ✅ Test |
| Disable Notifications | ✅ Test | ✅ Test | ✅ Test |

---

### Test 1: iOS Safari PWA Push Notifications

**Prerequisites**:
- iPhone or iPad with iOS 16.4+
- Safari browser
- HTTPS domain (required for PWA)

**Steps**:

1. **Add to Home Screen**:
   ```
   - Open your website in Safari
   - Tap Share button
   - Scroll and tap "Add to Home Screen"
   - Tap "Add"
   ```

2. **Open PWA and Enable Notifications**:
   ```
   - Open app from Home Screen (NOT Safari)
   - Navigate to notification settings
   - Toggle "Push Notifications" ON
   - Grant permission when prompted
   ```

3. **Verify Subscription Created**:
   ```javascript
   // Check in browser console (or server logs)
   const registration = await navigator.serviceWorker.ready;
   const subscription = await registration.pushManager.getSubscription();
   console.log(subscription.endpoint); // Should start with https://web.push.apple.com/
   ```

4. **Check Firestore**:
   ```javascript
   // participants/{participantId}
   {
     webPushSubscriptions: [
       {
         endpoint: "https://web.push.apple.com/QHBf...",
         keys: { p256dh: "...", auth: "..." },
         deviceId: "...",
         userAgent: "... Safari/604.1",
         createdAt: Timestamp(...)
       }
     ],
     pushNotificationEnabled: true
   }
   ```

5. **Send Test Notification**:
   ```bash
   # Using web-push CLI
   web-push send-notification \
     --endpoint="https://web.push.apple.com/QHBf..." \
     --key="p256dh_key_here" \
     --auth="auth_secret_here" \
     --vapid-subject="mailto:your-email@example.com" \
     --vapid-pubkey="your_vapid_public_key" \
     --vapid-pvtkey="your_vapid_private_key" \
     --payload='{"title":"Test","body":"Hello from iOS!"}'
   ```

6. **Verify Notification Received**:
   - Lock iPhone screen
   - Wait 5-10 seconds
   - Notification should appear on lock screen
   - Tap notification → App opens to correct page

**Expected Results**:
- ✅ Notification appears on lock screen
- ✅ Notification has custom title, body, icon
- ✅ Tapping notification opens app
- ✅ No "from 앱이름" text (clean notification)

---

### Test 2: Android Chrome Push Notifications

**Prerequisites**:
- Android device
- Chrome browser

**Steps**:

1. **Enable Notifications**:
   ```
   - Open website in Chrome
   - Toggle "Push Notifications" ON
   - Grant permission when prompted
   ```

2. **Verify Subscription Created**:
   ```javascript
   // Check Firestore
   {
     pushTokens: [
       {
         deviceId: "...",
         token: "eXg4aDNm...", // FCM token
         updatedAt: Timestamp(...)
       }
     ],
     webPushSubscriptions: [
       {
         endpoint: "https://fcm.googleapis.com/fcm/send/...",
         // ... Web Push also works on Android
       }
     ]
   }
   ```

3. **Send Test via Firebase**:
   ```
   - Firebase Console → Cloud Messaging → Send test message
   - Enter FCM token
   - Click "Test"
   ```

4. **Verify Notification Received**:
   - Close Chrome or switch to another app
   - Notification should appear

**Expected Results**:
- ✅ Both FCM and Web Push subscriptions created
- ✅ Notification appears in notification tray
- ✅ Tapping notification opens app

---

### Test 3: Multi-Device Support

**Scenario**: Same user, multiple devices.

**Steps**:

1. **Device 1** (iPhone): Enable notifications
2. **Device 2** (Android): Enable notifications
3. **Check Firestore**:
   ```javascript
   {
     pushTokens: [
       { deviceId: "android-device-id", token: "fcm-token-android" }
     ],
     webPushSubscriptions: [
       { deviceId: "ios-device-id", endpoint: "https://web.push.apple.com/..." },
       { deviceId: "android-device-id", endpoint: "https://fcm.googleapis.com/..." }
     ]
   }
   ```

4. **Send notification to both devices**
5. **Verify both receive notification**

**Expected Results**:
- ✅ Both devices receive notification
- ✅ Disabling on Device 1 doesn't affect Device 2
- ✅ No duplicate entries for same device

---

### Test 4: Safari Private Mode

**iOS Safari Private Mode has LIMITED localStorage access.**

**Steps**:

1. **Open Safari in Private Mode**:
   ```
   - Safari → Private Browsing → New Private Tab
   ```

2. **Visit website and enable notifications**:
   - Permission should be granted normally
   - `deviceId` will be generated but NOT saved to localStorage
   - **Web Push subscription endpoint is still stable** (browser-generated)

3. **Check Firestore**:
   ```javascript
   {
     webPushSubscriptions: [
       {
         endpoint: "https://web.push.apple.com/...", // Still works!
         deviceId: "1729234567890-...", // Generated each reload
       }
     ]
   }
   ```

4. **Reload page**:
   - New `deviceId` generated (localStorage unavailable)
   - **BUT** `endpoint` stays the same (browser-managed)

5. **Send notification using endpoint**:
   - Notification still works! ✅

**Expected Results**:
- ✅ Notifications work even in Private Mode
- ✅ endpoint-based checking prevents duplicate subscriptions
- ⚠️ deviceId changes on reload (expected in Private Mode)

---

### Test 5: Permission State Changes

**Test permission state edge cases.**

**Scenario 1: User grants, then revokes**:

1. Grant notification permission
2. Verify Firestore subscription exists
3. Revoke permission in browser settings
4. Reload app
5. Check that tokens/subscriptions are cleaned up

**Scenario 2: iOS Safari permission reset**:

1. Grant permission on iOS Safari PWA
2. Wait 24 hours (iOS may reset permission to 'default')
3. Reload app
4. **Expected**: Subscription still works (endpoint-based checking)
5. **NOT cleaned up** (only on explicit 'denied')

---

### Debugging Tools

#### 1. Check Service Worker Status

```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Registration:', reg);
  console.log('SW State:', reg?.active?.state);
  console.log('SW Script URL:', reg?.active?.scriptURL);
});
```

#### 2. Check Push Subscription

```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub?.toJSON());
  });
});
```

#### 3. Check Firestore Data

```javascript
// In browser console
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';

const participantRef = doc(getDb(), 'participants', 'YOUR_PARTICIPANT_ID');
const snap = await getDoc(participantRef);
console.log('Push Data:', {
  pushTokens: snap.data()?.pushTokens,
  webPushSubscriptions: snap.data()?.webPushSubscriptions,
  pushNotificationEnabled: snap.data()?.pushNotificationEnabled
});
```

#### 4. Check Logs

```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Check logs in console (filtered by tags)
// [RegisterSW] ...
// [NotificationToggle] ...
// [FCM] ...
// [Web Push] ...
```

---

### Cleanup Scripts

#### Remove All Tokens for Testing

```javascript
// In browser console or create an API route
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';

async function cleanupAllTokens(participantId) {
  const ref = doc(getDb(), 'participants', participantId);
  await updateDoc(ref, {
    pushTokens: [],
    webPushSubscriptions: [],
    pushNotificationEnabled: false,
    pushToken: deleteField(),
    pushTokenUpdatedAt: deleteField(),
  });
  console.log('Cleaned up all tokens');
}

cleanupAllTokens('YOUR_PARTICIPANT_ID');
```

#### Unsubscribe Client-Side

```javascript
// In browser console
const registration = await navigator.serviceWorker.getRegistration();
const subscription = await registration.pushManager.getSubscription();
if (subscription) {
  await subscription.unsubscribe();
  console.log('Unsubscribed from push');
}
```

---

## Troubleshooting

### Issue 1: "Service Worker not activating on iOS"

**Symptoms**:
- Service Worker installs but never activates
- `navigator.serviceWorker.controller` is `null`

**Diagnosis**:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Installing:', reg?.installing?.scriptURL);
  console.log('Waiting:', reg?.waiting?.scriptURL);
  console.log('Active:', reg?.active?.scriptURL);
  console.log('Controller:', navigator.serviceWorker.controller?.scriptURL);
});
```

**Solutions**:

1. **Force skip waiting**:
   ```javascript
   // In SW (public/sw.js)
   self.addEventListener('install', (event) => {
     self.skipWaiting(); // ✅ Forces immediate activation
   });
   ```

2. **Claim clients immediately**:
   ```javascript
   // In SW (public/sw.js)
   self.addEventListener('activate', (event) => {
     event.waitUntil(self.clients.claim()); // ✅ Takes control
   });
   ```

3. **Hard refresh PWA**:
   ```
   - Close PWA completely
   - Remove from Recent Apps
   - Re-open from Home Screen
   ```

---

### Issue 2: "navigator.serviceWorker.ready hangs forever"

**Symptoms**:
- Code waits indefinitely for `navigator.serviceWorker.ready`
- No errors, just infinite waiting

**Solution**:

```typescript
// ✅ ALWAYS use timeout
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('SW ready timeout')), 5000);
});

const registration = await Promise.race([
  navigator.serviceWorker.ready,
  timeoutPromise
]);
```

**Applied in**:
- `src/lib/firebase/webpush.ts` (line 191-198)
- `src/lib/firebase/messaging.ts` (line 149-156)
- `src/app/register-sw.tsx` (line 38-54)

---

### Issue 3: "Permission granted but notifications don't appear"

**Symptoms**:
- `Notification.permission` is `'granted'`
- No errors in console
- Notifications not showing up

**Diagnosis**:

1. **Check browser notification settings**:
   ```
   - iOS: Settings → Safari → Notifications → [Your Site]
   - Android: Chrome → Settings → Site Settings → Notifications
   ```

2. **Check if Service Worker is active**:
   ```javascript
   const reg = await navigator.serviceWorker.getRegistration();
   console.log('Active SW:', reg?.active?.state); // Should be 'activated'
   ```

3. **Check push subscription**:
   ```javascript
   const sub = await reg.pushManager.getSubscription();
   console.log('Subscription:', sub); // Should exist
   ```

**Solutions**:

1. **Re-subscribe**:
   ```javascript
   // Unsubscribe and re-subscribe
   const sub = await reg.pushManager.getSubscription();
   if (sub) await sub.unsubscribe();

   const newSub = await reg.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: vapidKey
   });
   ```

2. **Check endpoint validity**:
   ```javascript
   // Test if endpoint is still valid
   fetch(subscription.endpoint, { method: 'GET' })
     .then(res => console.log('Endpoint valid:', res.status));
   ```

---

### Issue 4: "Duplicate notifications (FCM auto + custom)"

**Symptoms**:
- Two notifications appear for one push
- One says "from 필립앤소피", one is clean

**Cause**: FCM automatically displays notifications when `notification` field is present in payload.

**Solution**:

```javascript
// In Service Worker (public/sw.js)
self.addEventListener('push', (event) => {
  const payload = event.data.json();

  // ✅ Skip if FCM auto notification will handle it
  if (payload?.notification && payload?.from) {
    console.log('Skipping (FCM auto notification)');
    return;
  }

  // Only show custom notification if not FCM auto
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
```

**Server-side payload format**:

```javascript
// ❌ BAD: Causes duplicate (FCM auto + custom)
{
  notification: { title: "...", body: "..." },
  data: { url: "..." }
}

// ✅ GOOD: Only custom notification
{
  data: {
    title: "...",
    body: "...",
    url: "..."
  }
}
```

---

### Issue 5: "localStorage not available (iOS Private Mode)"

**Symptoms**:
- Error: `SecurityError: The operation is insecure`
- Happens in iOS Safari Private Mode

**Solution**:

```typescript
// ✅ Wrap ALL localStorage access in try-catch
function getDeviceId() {
  try {
    const existingId = localStorage.getItem('device-id');
    if (existingId) return existingId;
  } catch (error) {
    logger.warn('localStorage unavailable (Private Mode?)');
  }

  // Generate deviceId normally
  const deviceId = generateDeviceId();

  try {
    localStorage.setItem('device-id', deviceId);
  } catch (error) {
    logger.warn('Cannot save deviceId (Private Mode)');
    // Continue anyway - endpoint-based checking doesn't need localStorage
  }

  return deviceId;
}
```

**Better approach**: Use endpoint-based checking (no localStorage needed).

```typescript
// ✅ Use subscription.endpoint instead of deviceId
const subscription = await getCurrentWebPushSubscription();
if (subscription) {
  // endpoint is stable even without localStorage
  isPushEnabled = isPushEnabledForEndpoint(data, subscription.endpoint);
}
```

---

### Issue 6: "iOS PWA permission state resets to 'default'"

**Symptoms**:
- User grants permission
- After some time, `Notification.permission` becomes `'default'`
- But notifications still work

**Cause**: iOS Safari PWA bug - permission state is unreliable.

**Solution**: Don't rely on browser permission state.

```typescript
// ❌ BAD: Unreliable on iOS
if (Notification.permission !== 'granted') {
  setIsEnabled(false);
}

// ✅ GOOD: Use Firestore as Single Source of Truth
const subscription = await getCurrentWebPushSubscription();
if (subscription) {
  const isPushEnabled = isPushEnabledForEndpoint(data, subscription.endpoint);
  setIsEnabled(isPushEnabled);
}

// Only cleanup on EXPLICIT denial (not 'default')
const browserPermission = Notification.permission;
if (isPushEnabled && browserPermission === 'denied') {
  await cleanupTokens();
}
```

---

### Issue 7: "Firestore shows multiple subscriptions for same device"

**Symptoms**:
- `webPushSubscriptions` array has duplicates
- Same `endpoint` appears multiple times

**Cause**: No deduplication logic when subscribing.

**Solution**:

```typescript
// ✅ API route: /api/push-subscriptions (POST)
// Before adding subscription, remove old ones with same endpoint
const webPushSubs = participantData.webPushSubscriptions || [];
const existingIndex = webPushSubs.findIndex(sub => sub.endpoint === endpoint);

if (existingIndex >= 0) {
  // Remove old subscription with same endpoint
  await updateDoc(participantRef, {
    webPushSubscriptions: arrayRemove(webPushSubs[existingIndex])
  });
}

// Add new subscription
await updateDoc(participantRef, {
  webPushSubscriptions: arrayUnion(newSubscription)
});
```

---

## Maintenance & Monitoring

### Token Cleanup Strategy

**Problem**: Expired tokens accumulate in Firestore.

**Solution**: Periodic cleanup of invalid tokens.

```typescript
// Cleanup script (run weekly via Cloud Function or cron job)
async function cleanupExpiredTokens() {
  const participantsRef = collection(db, 'participants');
  const snapshot = await getDocs(participantsRef);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const pushTokens = data.pushTokens || [];
    const webPushSubs = data.webPushSubscriptions || [];

    // Filter out tokens older than 30 days
    const now = new Date();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    const validTokens = pushTokens.filter(entry => {
      const age = now.getTime() - entry.updatedAt.toDate().getTime();
      return age < maxAge;
    });

    const validSubs = webPushSubs.filter(sub => {
      const age = now.getTime() - sub.createdAt.toDate().getTime();
      return age < maxAge;
    });

    // Update if changed
    if (validTokens.length !== pushTokens.length ||
        validSubs.length !== webPushSubs.length) {
      await updateDoc(doc.ref, {
        pushTokens: validTokens,
        webPushSubscriptions: validSubs
      });
    }
  }
}
```

---

### Monitoring Metrics

Track these metrics to ensure system health:

1. **Subscription Success Rate**:
   ```typescript
   // Track in analytics
   const successRate = (successfulSubscriptions / totalAttempts) * 100;
   ```

2. **Platform Distribution**:
   ```typescript
   // Count by platform
   const platforms = {
     ios: webPushSubs.filter(sub => sub.endpoint.includes('web.push.apple.com')).length,
     android: pushTokens.filter(t => t.userAgent.includes('Android')).length,
     desktop: pushTokens.filter(t => !t.userAgent.includes('Mobile')).length
   };
   ```

3. **Delivery Success Rate**:
   ```typescript
   // Track notification delivery failures
   const deliveryRate = (delivered / sent) * 100;
   ```

4. **Token Expiration Rate**:
   ```typescript
   // Monitor how often tokens become invalid
   const expirationRate = (invalidTokens / totalTokens) * 100;
   ```

---

### Error Handling Best Practices

1. **Always log errors with context**:
   ```typescript
   logger.error('Failed to subscribe to push', {
     participantId,
     deviceId,
     error: error.message,
     platform: navigator.userAgent
   });
   ```

2. **Implement retry logic**:
   ```typescript
   async function subscribeWithRetry(maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await subscribe();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(1000 * (i + 1)); // Exponential backoff
       }
     }
   }
   ```

3. **Graceful degradation**:
   ```typescript
   // If push fails, don't block user experience
   try {
     await initializePushNotifications(messaging, participantId);
   } catch (error) {
     logger.error('Push init failed, continuing without push', error);
     // App still works, just no push notifications
   }
   ```

---

## Additional Resources

### Official Documentation

- [Web Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)

### Tools & Libraries

- [web-push (npm)](https://www.npmjs.com/package/web-push) - Node.js library for Web Push
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) - Send FCM from server
- [PWABuilder](https://www.pwabuilder.com/) - Test PWA features

### Related Documentation

- [Firebase Setup Guide](./firebase.md) - Complete Firebase configuration
- [Database Schema](../optimization/database.md) - Firestore collections and types
- [Project Architecture](../architecture/system-design.md) - Overall system design

---

## Changelog

### Version 1.1.0 (2025-11-04)

**Environment Variables Update**:
- ✅ Updated all environment variables with actual production values
- ✅ Clarified FCM VAPID vs Web Push VAPID differences
- ✅ Added security warnings for private keys
- ✅ Verified all keys match current `.env.local` configuration

### Version 1.0.0 (2025-10-21)

**Initial Release**:
- ✅ Dual-strategy push system (FCM + Web Push)
- ✅ iOS Safari PWA support
- ✅ Multi-device token management
- ✅ endpoint-based subscription tracking
- ✅ localStorage Private Mode compatibility
- ✅ Timeout protection for `navigator.serviceWorker.ready`
- ✅ Permission state inconsistency fixes
- ✅ Comprehensive error handling

**Critical Fixes**:
- Fixed Service Worker registration timing on iOS PWA
- Removed next-pwa to prevent SW overwriting
- Added localStorage try-catch for Private Mode
- Implemented timeout for infinite `ready` hangs
- Use endpoint instead of deviceId for reliability

---

## Summary

This iOS PWA Web Push implementation represents **weeks of deep technical work** solving extremely challenging browser compatibility issues. The dual-strategy approach (FCM + Web Push) ensures maximum reliability across all platforms, with special attention to iOS Safari PWA quirks.

**Key Achievements**:
1. ✅ Working push notifications on iOS Safari PWA (extremely rare)
2. ✅ Multi-device support with automatic token management
3. ✅ Graceful handling of iOS Safari bugs (permission state, localStorage, SW ready)
4. ✅ Endpoint-based subscription tracking (no localStorage dependency)
5. ✅ Clean notification display (no "from 앱이름" text)

**Future Developers**: This system is production-tested and battle-hardened. Follow the patterns documented here, especially the timeout protections and endpoint-based checking, to maintain iOS PWA compatibility.

---

**Document Maintained By**: Development Team
**Last Reviewed**: 2025-10-21
**Status**: Production Ready ✅
