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
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove, Timestamp, deleteField } from 'firebase/firestore';
import { getDb } from './client';
import { logger } from '@/lib/logger';
import type { PushTokenEntry } from '@/types/database';

/**
 * Generate a unique device ID based on browser fingerprint
 *
 * This creates a semi-stable identifier for the current browser/device.
 * It's not 100% persistent (e.g., cleared on browser data clear), but good enough
 * for multi-device token management.
 *
 * @returns Device ID string
 */
function generateDeviceId(): string {
  // Check if device ID already exists in localStorage
  try {
    const existingId = localStorage.getItem('device-id');
    if (existingId) {
      return existingId;
    }
  } catch (error) {
    // Safari Private Mode에서 localStorage 읽기 실패 시 계속 진행
    logger.warn('localStorage read failed (Safari Private Mode?)', { error });
  }

  // Create a simple fingerprint from user agent and screen info
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;

  // Generate a hash-like string
  const fingerprint = `${ua}-${screen}-${timezone}-${language}`;
  const hash = Array.from(fingerprint).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0
  );

  // Create device ID: timestamp + hash + random
  const deviceId = `${Date.now()}-${Math.abs(hash)}-${Math.random().toString(36).substring(2, 9)}`;

  // ✅ Store in localStorage (Safari Private Mode 대응)
  try {
    localStorage.setItem('device-id', deviceId);
    logger.info('Generated new device ID', { deviceId });
  } catch (error) {
    // Safari Private Mode에서 localStorage 쓰기 실패 시 경고만 출력
    logger.warn('localStorage write failed (Safari Private Mode?), device ID will be regenerated on reload', {
      deviceId,
      error,
    });
  }

  return deviceId;
}

/**
 * Get current device ID (creates one if not exists)
 *
 * @returns Device ID string
 */
export function getDeviceId(): string {
  return generateDeviceId();
}

/**
 * Check if push notifications are supported in the current browser
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Ensure unified service worker is ready with timeout
 *
 * 변경 사항 (2025-10-17):
 * - 10초 타임아웃 추가 (무한 대기 방지)
 * - SW가 없으면 즉시 에러 반환
 * - 통합 SW는 register-sw.tsx에서 이미 등록됨
 */
async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    logger.error('[ensureServiceWorkerReady] Service Worker not supported');
    throw new Error('Service Worker not supported');
  }

  logger.info('[ensureServiceWorkerReady] Waiting for service worker to be ready...');

  try {
    // 10초 타임아웃으로 무한 대기 방지
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Service Worker ready timeout after 10s')), 10000);
    });

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      timeoutPromise
    ]);

    logger.info('[ensureServiceWorkerReady] Service worker is ready', {
      scope: registration.scope,
      scriptURL: registration.active?.scriptURL,
    });

    return registration;
  } catch (error) {
    logger.error('[ensureServiceWorkerReady] Failed to get ready service worker', error);
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
 * Save push token to Firestore participant document (Multi-device support)
 *
 * This function manages push tokens for multiple devices:
 * 1. Generates or retrieves device ID
 * 2. Removes old token entry for this device (if exists)
 * 3. Adds new token entry with current timestamp
 * 4. Also updates legacy pushToken field for backward compatibility
 *
 * @param participantId - Participant ID
 * @param token - FCM push token
 */
export async function savePushTokenToFirestore(
  participantId: string,
  token: string
): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const participantRef = doc(getDb(), 'participants', participantId);

    // Get current participant data to check existing tokens
    const participantSnap = await getDoc(participantRef);
    const currentData = participantSnap.exists() ? participantSnap.data() : {};
    const existingTokens: PushTokenEntry[] = currentData.pushTokens || [];

    // Find and remove old token entry for this device
    const oldTokenEntry = existingTokens.find((entry) => entry.deviceId === deviceId);

    // Create new token entry
    const newTokenEntry: PushTokenEntry = {
      deviceId,
      token,
      updatedAt: Timestamp.now(),
      userAgent: navigator.userAgent,
      lastUsedAt: Timestamp.now(),
    };

    // Update Firestore
    const updates: any = {
      // Add new token entry
      pushTokens: arrayUnion(newTokenEntry),
      // Legacy field for backward compatibility
      pushToken: token,
      pushTokenUpdatedAt: Timestamp.now(),
      // Enable push notifications
      pushNotificationEnabled: true,
    };

    // Remove old token entry if exists
    if (oldTokenEntry) {
      // Need to remove first, then add (Firestore doesn't support atomic replace in arrays)
      await updateDoc(participantRef, {
        pushTokens: arrayRemove(oldTokenEntry),
      });
      logger.info('Removed old token entry for device', { participantId, deviceId });
    }

    // Add new token entry
    await updateDoc(participantRef, updates);

    logger.info('Push token saved to Firestore (multi-device)', {
      participantId,
      deviceId,
      tokenPrefix: token.substring(0, 20) + '...',
    });
  } catch (error) {
    logger.error('Error saving push token to Firestore', error);
    throw error;
  }
}

/**
 * Get push token from Firestore participant document (Multi-device support)
 *
 * Returns the push token for the current device if it exists in pushTokens array.
 * Falls back to legacy pushToken field for backward compatibility.
 *
 * @param participantId - Participant ID
 * @returns Push token for current device or null if not found
 */
export async function getPushTokenFromFirestore(
  participantId: string
): Promise<string | null> {
  try {
    const participantRef = doc(getDb(), 'participants', participantId);
    const participantSnap = await getDoc(participantRef);

    if (!participantSnap.exists()) {
      return null;
    }

    const data = participantSnap.data();

    if (data?.pushNotificationEnabled === false) {
      logger.debug('Push notifications disabled for participant, no token expected', {
        participantId,
      });
      return null;
    }
    const deviceId = getDeviceId();

    // ✅ Priority 1: Check pushTokens array for current device
    const pushTokens: PushTokenEntry[] = data.pushTokens || [];
    const deviceToken = pushTokens.find((entry) => entry.deviceId === deviceId);

    if (deviceToken?.token) {
      logger.debug('Found push token for current device in pushTokens array', {
        participantId,
        deviceId,
        tokenPrefix: deviceToken.token.substring(0, 20) + '...',
      });
      return deviceToken.token;
    }

    // ✅ Priority 2: Fallback to legacy pushToken field
    const legacyToken = data.pushToken;
    if (legacyToken && typeof legacyToken === 'string' && legacyToken.trim().length > 0) {
      logger.debug('Found legacy push token (not in pushTokens array)', {
        participantId,
        tokenPrefix: legacyToken.substring(0, 20) + '...',
      });
      return legacyToken;
    }

    logger.debug('No push token found for participant', { participantId, deviceId });
    return null;
  } catch (error) {
    logger.error('Error getting push token from Firestore', error);
    return null;
  }
}

/**
 * Remove push token for current device from Firestore (Multi-device support)
 *
 * This removes the token entry for the current device from the pushTokens array.
 * Also updates pushNotificationEnabled flag if no tokens remain.
 *
 * @param participantId - Participant ID
 */
export async function removePushTokenFromFirestore(
  participantId: string
): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const participantRef = doc(getDb(), 'participants', participantId);

    // Get current participant data
    const participantSnap = await getDoc(participantRef);
    if (!participantSnap.exists()) {
      logger.warn('Cannot remove push token: participant not found', { participantId });
      return;
    }

    const currentData = participantSnap.data();
    const existingTokens: PushTokenEntry[] = currentData.pushTokens || [];

    // Find the token entry for this device
    const deviceTokenEntry = existingTokens.find((entry) => entry.deviceId === deviceId);

    if (!deviceTokenEntry) {
      logger.debug('No push token to remove for this device', { participantId, deviceId });
      return;
    }

    // Remove the token entry
    await updateDoc(participantRef, {
      pushTokens: arrayRemove(deviceTokenEntry),
    });

    // Check if there are any remaining tokens
    const remainingTokens = existingTokens.filter((entry) => entry.deviceId !== deviceId);

    // If no tokens remain, update pushNotificationEnabled to false
    if (remainingTokens.length === 0) {
      await updateDoc(participantRef, {
        pushNotificationEnabled: false,
        pushToken: deleteField(),
        pushTokenUpdatedAt: deleteField(),
      });
      logger.info('Removed last push token, disabled push notifications', {
        participantId,
        deviceId,
      });
    } else {
      logger.info('Removed push token for device', {
        participantId,
        deviceId,
        remainingDevices: remainingTokens.length,
      });
    }
  } catch (error) {
    logger.error('Error removing push token from Firestore', error);
    throw error;
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

    if (data?.pushNotificationEnabled === false) {
      logger.info('Push notifications disabled, skipping token refresh', {
        participantId,
      });
      return false;
    }
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
