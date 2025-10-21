/**
 * Firebase Cloud Messaging - Push Notification Management
 *
 * Features:
 * - Request notification permission
 * - Get FCM push token (Android/Desktop)
 * - Get Web Push subscription (iOS Safari + All Platforms)
 * - Save tokens to Firestore (dual-path support)
 * - Auto-refresh expired tokens (iOS fix)
 * - Handle foreground messages
 *
 * Strategy:
 * - FCM: Used on Android/Desktop (Chrome, Edge, Firefox)
 * - Web Push: Used on iOS Safari 16.4+ and as fallback for all browsers
 * - Both methods stored separately in Firestore for reliability
 */

'use client';

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, updateDoc, getDoc, Timestamp, deleteField, runTransaction } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './client';
import { logger } from '@/lib/logger';
import type { PushTokenEntry, WebPushSubscriptionData } from '@/types/database';
import {
  isFCMSupported,
  isWebPushSupported,
  createWebPushSubscription,
  getCurrentWebPushSubscription,
} from './webpush';

// ✅ 메모리 캐시: 세션 동안 device-id 유지 (localStorage 의존성 제거)
let cachedDeviceId: string | null = null;

/**
 * Generate a stable device ID based on browser fingerprint
 *
 * 전략:
 * 1. 메모리 캐시 우선 (세션 동안 유지)
 * 2. sessionStorage 폴백 (탭 닫으면 초기화)
 * 3. 브라우저 fingerprint로 일관성 있는 hash 생성
 *
 * localStorage 사용 안 함 → 리셋 스크립트 후에도 문제 없음
 *
 * @returns Device ID string
 */
function generateDeviceId(): string {
  // 1. 메모리 캐시 확인 (가장 빠름)
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // 2. sessionStorage 확인 (탭 유지 중이면 동일 ID)
  try {
    const sessionId = sessionStorage.getItem('device-id');
    if (sessionId) {
      cachedDeviceId = sessionId;
      logger.debug('Device ID from sessionStorage', { deviceId: sessionId });
      return sessionId;
    }
  } catch (error) {
    logger.warn('sessionStorage read failed, generating new device ID', { error });
  }

  // 3. 새로운 device ID 생성 (fingerprint 기반)
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;

  // Fingerprint hash (일관성 있는 값)
  const fingerprint = `${ua}-${screen}-${timezone}-${language}`;
  const hash = Array.from(fingerprint).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0
  );

  // Device ID: timestamp + hash (timestamp는 첫 생성 시에만)
  const deviceId = `${Date.now()}-${Math.abs(hash)}-${Math.random().toString(36).substring(2, 9)}`;

  // 4. 메모리 + sessionStorage에 저장
  cachedDeviceId = deviceId;
  try {
    sessionStorage.setItem('device-id', deviceId);
    logger.info('Generated new device ID (cached in memory + sessionStorage)', { deviceId });
  } catch (error) {
    logger.warn('sessionStorage write failed, using memory-only cache', { deviceId, error });
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
 * Push Channel Type Definition
 */
export type PushChannel = 'fcm' | 'webpush' | 'unsupported';

/**
 * Detect push notification channel based on platform
 *
 * Strategy:
 * - Android PWA → FCM only
 * - iOS PWA → Web Push only
 * - Chrome browser tabs → unsupported
 * - Other browsers → unsupported
 *
 * @returns Push channel type
 */
export function detectPushChannel(): PushChannel {
  // Server-side rendering
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  // Check if push notifications are supported at all
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }

  // Check if running in PWA/standalone mode
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true || // iOS Safari
    document.referrer.includes('android-app://'); // Android TWA

  if (!isStandalone) {
    logger.info('[detectPushChannel] Not in PWA/standalone mode - push unsupported');
    return 'unsupported';
  }

  // Detect iOS/Apple devices
  const isiOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

  // iOS PWA → Web Push only
  if (isiOS) {
    logger.info('[detectPushChannel] iOS PWA detected - using Web Push');
    return 'webpush';
  }

  // Android PWA → FCM only
  logger.info('[detectPushChannel] Android PWA detected - using FCM');
  return 'fcm';
}

/**
 * Build authorized JSON headers for push subscription API calls
 */
export async function buildAuthorizedJsonHeaders(): Promise<Record<string, string> | null> {
  try {
    const auth = getFirebaseAuth();

    // Wait for auth state if available (Firebase v10+)
    // @ts-ignore authStateReady is available in modern SDKs
    if (typeof auth.authStateReady === 'function') {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await auth.authStateReady();
    }

    const user = auth.currentUser;
    if (!user) {
      logger.error('No authenticated user found for push subscription API call');
      return null;
    }

    const idToken = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    };
  } catch (error) {
    logger.error('Failed to build auth headers for push subscription API', error);
    return null;
  }
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
 * 3. Adds new token entry with current timestamp and type
 *
 * @param participantId - Participant ID
 * @param token - FCM token or Web Push endpoint
 * @param type - Push channel type ('fcm' | 'webpush')
 */
export async function savePushTokenToFirestore(
  participantId: string,
  token: string,
  type: 'fcm' | 'webpush'
): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const db = getDb();
    const participantRef = doc(db, 'participants', participantId);

    // ✅ Use Firestore transaction to prevent race conditions
    await runTransaction(db, async (transaction) => {
      const participantSnap = await transaction.get(participantRef);
      const currentData = participantSnap.exists() ? participantSnap.data() : {};
      const existingTokens: PushTokenEntry[] = currentData.pushTokens || [];

      // Filter out ALL tokens for this device
      const tokensForOtherDevices = existingTokens.filter((entry) => entry.deviceId !== deviceId);

      // Create new token entry with type
      const newTokenEntry: PushTokenEntry = {
        deviceId,
        type, // Add channel type
        token,
        updatedAt: Timestamp.now(),
        userAgent: navigator.userAgent,
        lastUsedAt: Timestamp.now(),
      };

      // Build updated array
      const updatedTokens = [...tokensForOtherDevices, newTokenEntry];

      // Update in transaction (atomic)
      transaction.update(participantRef, {
        pushTokens: updatedTokens,
        // Legacy field for backward compatibility
        pushToken: token,
        pushTokenUpdatedAt: Timestamp.now(),
        // Enable push notifications
        pushNotificationEnabled: true,
      });
    });

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
    const pushTokens: PushTokenEntry[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
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
    // pushTokens 배열이 존재하지만 현재 디바이스가 없다면 구버전 토큰은 무시
    if (pushTokens.length > 0) {
      logger.debug('No token for current device; pushTokens array present, skipping legacy token', {
        participantId,
        deviceId,
        tokenEntries: pushTokens.length,
      });
      return null;
    }

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
 * Remove push token for current device
 *
 * Platform-specific removal:
 * - Web Push (iOS): Use DELETE /api/push-subscriptions (Admin SDK)
 * - FCM (Android): Use Client SDK Transaction
 *
 * @param participantId - Participant ID
 */
export async function removePushTokenFromFirestore(
  participantId: string
): Promise<void> {
  const deviceId = getDeviceId();
  const channel = detectPushChannel();

  try {
    // Web Push (iOS): Use Admin SDK via API
    if (channel === 'webpush') {
      logger.info('[removePushTokenFromFirestore] Removing Web Push via API', {
        participantId,
        deviceId,
      });

      // Get current subscription endpoint before unsubscribing
      let subscriptionEndpoint: string | undefined;
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              subscriptionEndpoint = subscription.endpoint;
            }
          }
        }
      } catch (error) {
        logger.warn('[removePushTokenFromFirestore] Failed to get subscription endpoint', error);
      }

      // Call DELETE API (requires authentication)
      const headers = await buildAuthorizedJsonHeaders();
      if (!headers) {
        throw new Error('Authentication required to remove Web Push subscription');
      }

      const response = await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          participantId,
          deviceId,
          subscriptionEndpoint,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to remove Web Push: ${errorData.error || response.statusText}`);
      }

      logger.info('[removePushTokenFromFirestore] Web Push removed via API');

      // Unsubscribe from browser PushManager
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              await subscription.unsubscribe();
              logger.info('[removePushTokenFromFirestore] Web Push subscription unsubscribed');
            }
          }
        }
      } catch (error) {
        logger.warn('[removePushTokenFromFirestore] Failed to unsubscribe Web Push (non-critical)', error);
      }

      return;
    }

    // FCM (Android): Use Client SDK Transaction
    logger.info('[removePushTokenFromFirestore] Removing FCM via Client SDK', {
      participantId,
      deviceId,
    });

    const participantRef = doc(getDb(), 'participants', participantId);

    // Use transaction to prevent race conditions
    await runTransaction(getDb(), async (transaction) => {
      const participantSnap = await transaction.get(participantRef);
      if (!participantSnap.exists()) {
        logger.warn('[removePushTokenFromFirestore] Participant not found', { participantId });
        return;
      }

      const currentData = participantSnap.data();
      const existingTokens: PushTokenEntry[] = currentData.pushTokens || [];
      const existingWebPushSubs = currentData.webPushSubscriptions || [];

      // Filter out FCM tokens for current device
      const tokensForOtherDevices = existingTokens.filter(
        (entry) => entry.deviceId !== deviceId
      );

      // Calculate total tokens (FCM only, Web Push handled via API)
      const totalTokensRemaining = tokensForOtherDevices.length + existingWebPushSubs.length;

      // Update with remaining tokens
      const updates: any = {
        pushTokens: tokensForOtherDevices,
        // Disable push ONLY if no tokens remain
        pushNotificationEnabled: totalTokensRemaining > 0,
      };

      // Clean up legacy fields if no tokens remain at all
      if (totalTokensRemaining === 0) {
        updates.pushToken = deleteField();
        updates.pushTokenUpdatedAt = deleteField();
      }

      transaction.update(participantRef, updates);
    });

    logger.info('[removePushTokenFromFirestore] FCM token removed for device', {
      participantId,
      deviceId,
    });
  } catch (error) {
    logger.error('[removePushTokenFromFirestore] Error removing push token', error);
    throw error;
  }
}

/**
 * Initialize FCM for Android PWA
 *
 * @param messaging - Firebase Messaging instance
 * @param participantId - Participant ID
 * @returns FCM token and cleanup function, or null if failed
 */
async function initializeFCM(
  messaging: Messaging,
  participantId: string
): Promise<{ token: string; cleanup: () => void } | null> {
  try {
    const token = await getFCMToken(messaging);
    if (!token) {
      logger.error('[initializeFCM] Failed to get FCM token');
      return null;
    }

    // Save FCM token with type
    await savePushTokenToFirestore(participantId, token, 'fcm');

    // Setup foreground message handler
    const cleanup = setupForegroundMessageHandler(messaging);

    logger.info('[initializeFCM] FCM initialized successfully', {
      participantId,
      tokenPrefix: token.substring(0, 20) + '...',
    });

    return { token, cleanup };
  } catch (error) {
    logger.error('[initializeFCM] Error initializing FCM', error);
    return null;
  }
}

/**
 * Initialize Web Push for iOS PWA
 *
 * @param participantId - Participant ID
 * @returns Web Push endpoint and cleanup function, or null if failed
 */
async function initializeWebPush(
  participantId: string
): Promise<{ token: string; cleanup: () => void } | null> {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_KEY;
    if (!vapidKey) {
      logger.error('[initializeWebPush] VAPID key not found');
      return null;
    }

    // Create Web Push subscription
    const subscription = await createWebPushSubscription(vapidKey);
    if (!subscription) {
      logger.error('[initializeWebPush] Failed to create subscription');
      return null;
    }

    // Save Web Push subscription with type (requires authentication)
    const headers = await buildAuthorizedJsonHeaders();
    if (!headers) {
      logger.error('[initializeWebPush] No auth headers - user not logged in');
      throw new Error('Authentication required for Web Push subscription');
    }

    const response = await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        participantId,
        subscription: subscription.toJSON(),
        deviceId: getDeviceId(),
        type: 'webpush', // Add type field
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('[initializeWebPush] Failed to save subscription', errorData);
      throw new Error(`Failed to save Web Push subscription: ${errorData.error || 'Unknown error'}`);
    }

    logger.info('[initializeWebPush] Web Push initialized successfully', {
      participantId,
      endpoint: subscription.endpoint,
    });

    return {
      token: subscription.endpoint,
      cleanup: () => {}, // No cleanup needed for Web Push
    };
  } catch (error) {
    logger.error('[initializeWebPush] Error initializing Web Push', error);
    return null;
  }
}

/**
 * Initialize push notifications based on platform
 *
 * Simplified flow:
 * 1. Check permissions
 * 2. Detect platform channel
 * 3. Initialize appropriate channel
 *
 * @param messaging - Firebase Messaging instance (optional, only for FCM)
 * @param participantId - Participant ID
 * @returns Object with token and cleanup function, or null if failed
 */
export async function initializePushNotifications(
  messaging: Messaging | null,
  participantId: string
): Promise<{ token: string; cleanup: () => void } | null> {
  try {
    // Check current permission status
    const permission = getNotificationPermission();
    if (permission === 'denied') {
      logger.warn('[initializePushNotifications] Permission denied');
      return null;
    }

    // Request permission if needed
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        logger.warn('[initializePushNotifications] User denied permission');
        return null;
      }
    }

    // Detect platform channel
    const channel = detectPushChannel();

    logger.info('[initializePushNotifications] Channel detected', { channel });

    // Initialize based on channel
    switch (channel) {
      case 'fcm':
        if (!messaging) {
          logger.error('[initializePushNotifications] FCM requires messaging instance');
          return null;
        }
        return await initializeFCM(messaging, participantId);

      case 'webpush':
        return await initializeWebPush(participantId);

      case 'unsupported':
      default:
        logger.info('[initializePushNotifications] Push notifications not supported on this platform');
        return null;
    }
  } catch (error) {
    logger.error('[initializePushNotifications] Error initializing push notifications', error);
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
        await savePushTokenToFirestore(participantId, newToken, 'fcm'); // FCM refresh only
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
  messaging: Messaging | null,
  participantId: string
): Promise<void> {
  try {
    if (!messaging) {
      logger.info('Skipping token refresh: messaging instance not provided (likely Safari)');
      return;
    }

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
