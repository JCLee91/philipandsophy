/**
 * Standard Web Push API - Utilities
 *
 * Features:
 * - VAPID key conversion (base64 to Uint8Array)
 * - PushSubscription management
 * - Platform detection (FCM vs Web Push)
 * - Works for iOS Safari, Android, Desktop
 */

'use client';

import { logger } from '@/lib/logger';
import type { WebPushSubscriptionData } from '@/types/database';

/**
 * Convert base64 VAPID key to Uint8Array
 *
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

/**
 * Check if FCM is supported (async)
 *
 * Uses Firebase's isSupported() for accurate runtime detection.
 * FCM works on Chrome, Edge, Firefox (but NOT iOS Safari, Desktop Safari)
 */
export async function isFCMSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    // Quick check for basic requirements
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return false;
    }

    // Use Firebase's official support detection (async)
    const { isSupported } = await import('firebase/messaging');
    const supported = await isSupported();

    if (!supported) {
      logger.info('FCM not supported by Firebase messaging library');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error checking FCM support', error);
    return false;
  }
}

/**
 * Check if standard Web Push is supported
 *
 * Works on all modern browsers including iOS Safari 16.4+
 */
export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Create Web Push subscription
 *
 * @param vapidKey - VAPID public key (base64 encoded)
 * @returns PushSubscription object
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
      logger.info('Already subscribed to Web Push', {
        endpoint: existingSubscription.endpoint,
      });
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

/**
 * Unsubscribe from Web Push
 */
export async function unsubscribeWebPush(): Promise<boolean> {
  try {
    if (!isWebPushSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      logger.info('Unsubscribed from Web Push');
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error unsubscribing from Web Push', error);
    return false;
  }
}

/**
 * Convert PushSubscription to JSON format for storage
 */
export function serializeWebPushSubscription(
  subscription: PushSubscription,
  deviceId: string
): WebPushSubscriptionData {
  const keys = subscription.toJSON().keys;

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: keys?.p256dh || '',
      auth: keys?.auth || '',
    },
    deviceId,
    userAgent: navigator.userAgent,
    createdAt: new Date(),
  };
}

/**
 * Get current Web Push subscription (with timeout)
 *
 * iOS Safari에서 navigator.serviceWorker.ready가 무한 대기될 수 있으므로
 * 5초 타임아웃을 설정하여 안전하게 처리합니다.
 */
export async function getCurrentWebPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isWebPushSupported()) {
      return null;
    }

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
