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

// ✅ 메모리 캐시: 반복 호출 최적화
let cachedDeviceId: string | null = null;

/**
 * Generate a stable device ID based on browser fingerprint
 *
 * 전략:
 * 1. 메모리 캐시 우선 (같은 페이지 로드 내에서 재사용)
 * 2. localStorage 사용 (PWA 재실행 간에도 유지 - 필수!)
 * 3. Fingerprint 기반 생성 (최초 1회)
 *
 * localStorage는 반드시 필요:
 * - PWA 종료 후 재실행 시에도 동일 device-id 유지
 * - 같은 기기의 토큰 중복 방지
 * - 디바이스별 독립적 제어를 위한 핵심 요소
 *
 * @returns Device ID string
 */
function generateDeviceId(): string {
  // 1. 메모리 캐시 확인 (가장 빠름)
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // 2. localStorage 확인 (PWA 재실행 간에도 유지)
  try {
    const existingId = localStorage.getItem('device-id');
    if (existingId) {
      cachedDeviceId = existingId;

      return existingId;
    }
  } catch (error) {

  }

  // 3. 새로운 device ID 생성 (fingerprint 기반)
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;

  // Fingerprint hash
  const fingerprint = `${ua}-${screen}-${timezone}-${language}`;
  const hash = Array.from(fingerprint).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0
  );

  // Device ID: timestamp + hash + random
  const deviceId = `${Date.now()}-${Math.abs(hash)}-${Math.random().toString(36).substring(2, 9)}`;

  // 4. 메모리 + localStorage에 저장
  cachedDeviceId = deviceId;
  try {
    localStorage.setItem('device-id', deviceId);

  } catch (error) {

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
 * - Chrome browser tabs → unsupported (EXCEPT in development mode)
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

  // Development mode: Allow FCM in browser tab
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Allow Android Browser (not just PWA) to use FCM
  if (!isStandalone && !isDevelopment && !isAndroid) {
    return 'unsupported';
  }

  // Detect iOS/Apple devices
  const isiOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

  // iOS PWA → Web Push only
  if (isiOS) {

    return 'webpush';
  }

  // Android PWA or Development browser → FCM
  if (isDevelopment && !isStandalone) {

  } else {

  }
  return 'fcm';
}

/**
 * Build authorized JSON headers for push subscription API calls
 */
export async function buildAuthorizedJsonHeaders(): Promise<Record<string, string> | null> {
  try {
    const auth = getFirebaseAuth();

    // Wait for auth state if available (Firebase v10+)
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }

    const user = auth.currentUser;
    if (!user) {

      return null;
    }

    const idToken = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    };
  } catch (error) {

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

    throw new Error('Service Worker not supported');
  }

  try {
    // 10초 타임아웃으로 무한 대기 방지
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Service Worker ready timeout after 10s')), 10000);
    });

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      timeoutPromise
    ]);

    return registration;
  } catch (error) {

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

    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();

    return permission;
  } catch (error) {

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

      throw new Error('VAPID key not configured');
    }

    // Get FCM token with the registered service worker
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {

      return currentToken;
    } else {

      return null;
    }
  } catch (error) {

    return null;
  }
}

/**
 * Save push token to Firestore participant document (Single device - simplified)
 *
 * 단순화 전략:
 * 1. 기존 모든 토큰/구독 삭제
 * 2. 현재 기기의 토큰만 저장
 * 3. deviceId 불필요 (마지막 기기만 유효)
 *
 * 장점:
 * - deviceId 불일치 문제 완전 제거
 * - localStorage 의존성 최소화
 * - 토글 ON/OFF 확실하게 작동
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

    // ✅ Transaction 사용 (필드 없어도 생성 가능, 안정적)
    await runTransaction(db, async (transaction) => {
      const participantSnap = await transaction.get(participantRef);

      if (!participantSnap.exists()) {

        throw new Error('Participant not found');
      }

      // 새 토큰 엔트리
      const newTokenEntry: PushTokenEntry = {
        deviceId,
        type,
        token,
        updatedAt: Timestamp.now(),
        userAgent: navigator.userAgent,
        lastUsedAt: Timestamp.now(),
      };

      // ✅ 단순화: 기존 모든 토큰 삭제, 현재 토큰만 저장
      transaction.update(participantRef, {
        pushTokens: [newTokenEntry], // FCM 토큰만 저장
        webPushSubscriptions: [], // Web Push 구독 삭제
        pushNotificationEnabled: true,
      });
    });

  } catch (error) {

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

      return null;
    }
    const deviceId = getDeviceId();

    // ✅ Priority 1: Check pushTokens array for current device
    const pushTokens: PushTokenEntry[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
    const deviceToken = pushTokens.find((entry) => entry.deviceId === deviceId);

    if (deviceToken?.token) {

      return deviceToken.token;
    }

    return null;
  } catch (error) {

    return null;
  }
}

/**
 * Remove all push tokens (simplified - single device strategy)
 *
 * 단순화 전략:
 * - 모든 토큰/구독 완전 삭제
 * - pushNotificationEnabled = false
 * - Transaction 사용 (안정성)
 *
 * @param participantId - Participant ID
 */
export async function removePushTokenFromFirestore(
  participantId: string
): Promise<void> {
  try {
    const db = getDb();
    const participantRef = doc(db, 'participants', participantId);

    // ✅ Transaction 사용 (안정적)
    await runTransaction(db, async (transaction) => {
      const participantSnap = await transaction.get(participantRef);

      if (!participantSnap.exists()) {

        return;
      }

      // 모든 토큰/구독 삭제
      transaction.update(participantRef, {
        pushTokens: [],
        webPushSubscriptions: [],
        pushNotificationEnabled: false,
      });
    });

    // ✅ 브라우저 PushManager에서도 구독 해제 (Web Push)
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();

          }
        }
      }
    } catch (error) {

    }
  } catch (error) {

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

      return null;
    }

    // Save FCM token with type
    await savePushTokenToFirestore(participantId, token, 'fcm');

    // Setup foreground message handler
    const cleanup = setupForegroundMessageHandler(messaging);

    return { token, cleanup };
  } catch (error) {

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

      return null;
    }

    // Create Web Push subscription
    const subscription = await createWebPushSubscription(vapidKey);
    if (!subscription) {

      return null;
    }

    // Save Web Push subscription with type (requires authentication)
    const headers = await buildAuthorizedJsonHeaders();
    if (!headers) {

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

      throw new Error(`Failed to save Web Push subscription: ${errorData.error || 'Unknown error'}`);
    }

    return {
      token: subscription.endpoint,
      cleanup: () => {}, // No cleanup needed for Web Push
    };
  } catch (error) {

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

      return null;
    }

    // Request permission if needed
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {

        return null;
      }
    }

    // Detect platform channel
    const channel = detectPushChannel();

    // Initialize based on channel
    switch (channel) {
      case 'fcm':
        if (!messaging) {

          return null;
        }
        return await initializeFCM(messaging, participantId);

      case 'webpush':
        return await initializeWebPush(participantId);

      case 'unsupported':
      default:

        return null;
    }
  } catch (error) {

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

    return existingPromise;
  }

  // Create new refresh promise
  const refreshPromise = (async () => {
    try {

      // Get current token from Firestore
      const storedToken = await getPushTokenFromFirestore(participantId);

      // Get new token from FCM
      const newToken = await getFCMToken(messaging);

      if (!newToken) {

        return null;
      }

      // If token changed, update Firestore
      if (storedToken !== newToken) {

        await savePushTokenToFirestore(participantId, newToken, 'fcm'); // FCM refresh only
      } else {

      }

      return newToken;
    } catch (error) {

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

      return false;
    }
    // pushTokens 배열에서 가장 오래된 토큰 확인
    const pushTokens: PushTokenEntry[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
    const webPushSubscriptions: WebPushSubscriptionData[] = Array.isArray(data.webPushSubscriptions)
      ? data.webPushSubscriptions
      : [];

    if (pushTokens.length === 0) {
      return false;
    }

    // 가장 최근 업데이트된 토큰 찾기
    const latestUpdate = pushTokens.reduce((latest, entry) => {
      const entryDate = entry.updatedAt?.toDate();
      return entryDate && (!latest || entryDate > latest) ? entryDate : latest;
    }, null as Date | null);

    if (!latestUpdate) {
      return true;
    }

    // Check if token is older than 7 days (refresh weekly for iOS)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return latestUpdate < sevenDaysAgo;
  } catch (error) {

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

      return;
    }

    const needsRefresh = await shouldRefreshPushToken(participantId);

    if (needsRefresh) {

      await refreshPushToken(messaging, participantId);
    } else {

    }
  } catch (error) {

  }
}
