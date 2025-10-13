/**
 * Firebase Cloud Messaging - Push Notification Management
 *
 * Features:
 * - Request notification permission
 * - Get FCM push token
 * - Save token to Firestore
 * - Auto-refresh expired tokens (iOS fix)
 * - Handle foreground messages
 */

'use client';

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getDb } from './client';
import { logger } from '@/lib/logger';

/**
 * Check if push notifications are supported in the current browser
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Wait for service worker to activate
 */
async function waitForActivation(registration: ServiceWorkerRegistration): Promise<void> {
  if (!registration.installing) {
    return; // Already active or waiting
  }

  return new Promise<void>((resolve) => {
    const worker = registration.installing!;
    const handler = (e: Event) => {
      if ((e.target as ServiceWorker).state === 'activated') {
        worker.removeEventListener('statechange', handler); // Cleanup listener
        resolve();
      }
    };
    worker.addEventListener('statechange', handler);
  });
}

/**
 * Register and ensure service worker is ready
 * This fixes the issue where navigator.serviceWorker.ready never resolves
 * because Firebase SDK expects the service worker to already be registered
 */
async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    logger.error('[ensureServiceWorkerReady] Service Worker not supported');
    throw new Error('Service Worker not supported');
  }

  logger.info('[ensureServiceWorkerReady] Registering firebase-messaging-sw.js...');

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    logger.info('[ensureServiceWorkerReady] Service worker registered', {
      scope: registration.scope,
      state: registration.active ? 'active' : registration.installing ? 'installing' : 'waiting'
    });

    await waitForActivation(registration);

    logger.info('[ensureServiceWorkerReady] Service worker is active', { scope: registration.scope });
    return registration;
  } catch (error) {
    logger.error('[ensureServiceWorkerReady] Failed to register service worker', error);
    throw error;
  }
}

/**
 * Request notification permission from user
 *
 * @returns Permission status ('granted', 'denied', or 'default')
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    logger.warn('Push notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    logger.info('Notification permission:', permission);
    return permission;
  } catch (error) {
    logger.error('Error requesting notification permission', error);
    return 'denied';
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Get FCM push token
 *
 * @param messaging - Firebase Messaging instance
 * @returns FCM token or null if failed
 */
export async function getFCMToken(messaging: Messaging): Promise<string | null> {
  try {
    // Register and ensure service worker is ready
    const registration = await ensureServiceWorkerReady();

    // Get VAPID key from environment variables
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

    if (!vapidKey) {
      logger.error('VAPID key not found in environment variables');
      throw new Error('VAPID key not configured');
    }

    // Get FCM token with the registered service worker
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      logger.info('FCM token obtained');
      return currentToken;
    } else {
      logger.warn('No FCM token available. Request permission first.');
      return null;
    }
  } catch (error) {
    logger.error('Error getting FCM token', error);
    return null;
  }
}

/**
 * Save push token to Firestore participant document
 *
 * @param participantId - Participant ID
 * @param token - FCM push token
 */
export async function savePushTokenToFirestore(
  participantId: string,
  token: string
): Promise<void> {
  try {
    const participantRef = doc(getDb(), 'participants', participantId);

    await updateDoc(participantRef, {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
    });

    logger.info('Push token saved to Firestore', { participantId });
  } catch (error) {
    logger.error('Error saving push token to Firestore', error);
    throw error;
  }
}

/**
 * Get push token from Firestore participant document
 *
 * @param participantId - Participant ID
 * @returns Push token or null if not found
 */
export async function getPushTokenFromFirestore(
  participantId: string
): Promise<string | null> {
  try {
    const participantRef = doc(getDb(), 'participants', participantId);
    const participantSnap = await getDoc(participantRef);

    if (participantSnap.exists()) {
      const token = participantSnap.data()?.pushToken;
      // Validate token is non-empty string
      return token && typeof token === 'string' && token.trim().length > 0 ? token : null;
    }

    return null;
  } catch (error) {
    logger.error('Error getting push token from Firestore', error);
    return null;
  }
}

/**
 * Initialize push notifications for a user
 *
 * This should be called when:
 * 1. User logs in
 * 2. User grants notification permission
 * 3. App is opened (to refresh expired tokens)
 *
 * @param messaging - Firebase Messaging instance
 * @param participantId - Participant ID
 * @returns Object with FCM token and cleanup function, or null if failed
 */
export async function initializePushNotifications(
  messaging: Messaging,
  participantId: string
): Promise<{ token: string; cleanup: () => void } | null> {
  try {
    // Check if push notifications are supported
    if (!isPushNotificationSupported()) {
      logger.warn('Push notifications not supported on this device');
      return null;
    }

    // Check current permission status
    const permission = getNotificationPermission();

    if (permission === 'denied') {
      logger.warn('Notification permission denied');
      return null;
    }

    // If permission is not granted, request it
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        logger.warn('User denied notification permission');
        return null;
      }
    }

    // Get FCM token
    const token = await getFCMToken(messaging);

    if (!token) {
      logger.error('Failed to get FCM token');
      return null;
    }

    // Save token to Firestore
    await savePushTokenToFirestore(participantId, token);

    // Setup foreground message handler and get cleanup function
    const cleanup = setupForegroundMessageHandler(messaging);

    logger.info('Push notifications initialized', { participantId });
    return { token, cleanup };
  } catch (error) {
    logger.error('Error initializing push notifications', error);
    return null;
  }
}

// Prevent concurrent token refresh for same participant
const tokenRefreshPromises = new Map<string, Promise<string | null>>();

/**
 * Refresh push token (for iOS expired token issue)
 *
 * iOS PWA push tokens expire after 1-2 weeks.
 * This function should be called periodically to refresh the token.
 *
 * @param messaging - Firebase Messaging instance
 * @param participantId - Participant ID
 * @returns New FCM token or null if failed
 */
export async function refreshPushToken(
  messaging: Messaging,
  participantId: string
): Promise<string | null> {
  // Check if refresh is already in progress
  const existingPromise = tokenRefreshPromises.get(participantId);
  if (existingPromise) {
    logger.info('Token refresh already in progress, reusing promise', { participantId });
    return existingPromise;
  }

  // Create new refresh promise
  const refreshPromise = (async () => {
    try {
      logger.info('Refreshing push token', { participantId });

      // Get current token from Firestore
      const storedToken = await getPushTokenFromFirestore(participantId);

      // Get new token from FCM
      const newToken = await getFCMToken(messaging);

      if (!newToken) {
        logger.error('Failed to get new FCM token');
        return null;
      }

      // If token changed, update Firestore
      if (storedToken !== newToken) {
        logger.info('Push token changed, updating Firestore', {
          participantId,
          oldTokenPrefix: storedToken?.substring(0, 20) + '...',
          newTokenPrefix: newToken.substring(0, 20) + '...',
        });
        await savePushTokenToFirestore(participantId, newToken);
      } else {
        logger.info('Push token unchanged', { participantId });
      }

      return newToken;
    } catch (error) {
      logger.error('Error refreshing push token', error);
      return null;
    } finally {
      // Clean up promise from map
      tokenRefreshPromises.delete(participantId);
    }
  })();

  // Store promise
  tokenRefreshPromises.set(participantId, refreshPromise);
  return refreshPromise;
}

/**
 * Setup foreground message handler
 *
 * Handles push notifications when the app is open (in foreground)
 *
 * @param messaging - Firebase Messaging instance
 * @returns Cleanup function to unsubscribe the listener
 */
function setupForegroundMessageHandler(messaging: Messaging): () => void {
  const unsubscribe = onMessage(messaging, (payload) => {
    logger.info('Foreground message received', payload);

    // Foreground에서는 FCM notification이 자동으로 표시되지 않음
    // 하지만 여기서 showNotification을 호출하면 "from 필립앤소피"가 붙음
    // 따라서 foreground에서는 알림을 표시하지 않거나, UI 내에서 toast 등으로 처리
    // 현재는 알림을 표시하지 않음 (백그라운드에서만 알림 표시)
  });

  return unsubscribe;
}

/**
 * Check if push token needs refresh (for iOS)
 *
 * @param participantId - Participant ID
 * @returns true if token needs refresh, false otherwise
 */
export async function shouldRefreshPushToken(participantId: string): Promise<boolean> {
  try {
    const participantRef = doc(getDb(), 'participants', participantId);
    const participantSnap = await getDoc(participantRef);

    if (!participantSnap.exists()) {
      return false;
    }

    const data = participantSnap.data();
    const pushTokenUpdatedAt = data?.pushTokenUpdatedAt?.toDate();

    if (!pushTokenUpdatedAt) {
      // No token saved yet, should initialize
      return true;
    }

    // Check if token is older than 7 days (refresh weekly for iOS)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return pushTokenUpdatedAt < sevenDaysAgo;
  } catch (error) {
    logger.error('Error checking push token refresh status', error);
    return false;
  }
}

/**
 * Auto-refresh push token on app open (iOS fix)
 *
 * This should be called in the app's root layout or provider
 * to automatically refresh expired tokens.
 *
 * @param messaging - Firebase Messaging instance
 * @param participantId - Participant ID
 */
export async function autoRefreshPushToken(
  messaging: Messaging,
  participantId: string
): Promise<void> {
  try {
    const needsRefresh = await shouldRefreshPushToken(participantId);

    if (needsRefresh) {
      logger.info('Push token needs refresh', { participantId });
      await refreshPushToken(messaging, participantId);
    } else {
      logger.info('Push token is up to date', { participantId });
    }
  } catch (error) {
    logger.error('Error auto-refreshing push token', error);
  }
}
