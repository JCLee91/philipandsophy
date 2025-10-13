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
 * Register and ensure service worker is ready
 * This fixes the issue where navigator.serviceWorker.ready never resolves
 * because Firebase SDK expects the service worker to already be registered
 */
async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  logger.info('[ensureServiceWorkerReady] Checking service worker support...');

  if (!('serviceWorker' in navigator)) {
    logger.error('[ensureServiceWorkerReady] Service Worker not supported');
    throw new Error('Service Worker not supported');
  }

  logger.info('[ensureServiceWorkerReady] Registering firebase-messaging-sw.js...');

  try {
    // Register the service worker explicitly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    logger.info('[ensureServiceWorkerReady] Service worker registered, waiting for active...', {
      scope: registration.scope,
      installing: !!registration.installing,
      waiting: !!registration.waiting,
      active: !!registration.active
    });

    // Wait for service worker to become active
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', function handler(e) {
          if ((e.target as ServiceWorker).state === 'activated') {
            resolve();
          }
        });
      });
    }

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
    logger.info('[getFCMToken] Starting...');

    // Register and ensure service worker is ready
    logger.info('[getFCMToken] Ensuring service worker is ready...');
    const registration = await ensureServiceWorkerReady();
    logger.info('[getFCMToken] Service worker is ready');

    // Get VAPID key from environment variables
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    logger.info('[getFCMToken] VAPID key exists:', !!vapidKey);

    if (!vapidKey) {
      logger.error('VAPID key not found in environment variables');
      throw new Error('VAPID key not configured');
    }

    // Get FCM token with the registered service worker
    logger.info('[getFCMToken] Calling getToken with registration...');
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    logger.info('[getFCMToken] getToken completed, token exists:', !!currentToken);

    if (currentToken) {
      logger.info('FCM token obtained', { tokenPrefix: currentToken.substring(0, 20) + '...' });
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
      return participantSnap.data()?.pushToken || null;
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
 * @returns FCM token or null if failed
 */
export async function initializePushNotifications(
  messaging: Messaging,
  participantId: string
): Promise<string | null> {
  try {
    logger.info('[initializePushNotifications] Starting...');

    // Check if push notifications are supported
    if (!isPushNotificationSupported()) {
      logger.warn('Push notifications not supported on this device');
      return null;
    }
    logger.info('[initializePushNotifications] Push notifications supported');

    // Check current permission status
    const permission = getNotificationPermission();
    logger.info('[initializePushNotifications] Current permission:', permission);

    if (permission === 'denied') {
      logger.warn('Notification permission denied');
      return null;
    }

    // If permission is not granted, request it
    if (permission !== 'granted') {
      logger.info('[initializePushNotifications] Requesting permission...');
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        logger.warn('User denied notification permission');
        return null;
      }
    }

    // Get FCM token
    logger.info('[initializePushNotifications] Getting FCM token...');
    const token = await getFCMToken(messaging);
    logger.info('[initializePushNotifications] FCM token received:', token ? 'YES' : 'NO');

    if (!token) {
      logger.error('Failed to get FCM token');
      return null;
    }

    // Save token to Firestore
    logger.info('[initializePushNotifications] Saving token to Firestore...');
    await savePushTokenToFirestore(participantId, token);
    logger.info('[initializePushNotifications] Token saved to Firestore');

    // Setup foreground message handler
    logger.info('[initializePushNotifications] Setting up foreground handler...');
    setupForegroundMessageHandler(messaging);

    logger.info('Push notifications initialized successfully', { participantId });
    return token;
  } catch (error) {
    logger.error('Error initializing push notifications', error);
    return null;
  }
}

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
  }
}

/**
 * Setup foreground message handler
 *
 * Handles push notifications when the app is open (in foreground)
 *
 * @param messaging - Firebase Messaging instance
 */
function setupForegroundMessageHandler(messaging: Messaging): void {
  onMessage(messaging, (payload) => {
    logger.info('Foreground message received', payload);

    // Show browser notification
    // title을 비워서 manifest.json의 short_name이 자동으로 표시되도록 함
    // body를 data 필드에서 읽음 (notification 필드는 사용하지 않음)
    const notificationOptions = {
      body: payload.data?.body || '새 알림이 도착했습니다',
      icon: '/image/favicon.webp',
      badge: '/image/favicon.webp',
      tag: payload.data?.type || 'general',
      data: payload.data || {},
    };

    // Show notification using Notification API (title은 빈 문자열)
    if (Notification.permission === 'granted') {
      const notification = new Notification('', notificationOptions);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        const url = payload.data?.url || '/app/chat';
        window.open(url, '_blank');
        notification.close();
      };
    }
  });
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
