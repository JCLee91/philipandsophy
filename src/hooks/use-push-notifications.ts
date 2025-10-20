/**
 * Custom Hook for Push Notifications
 *
 * Features:
 * - Initialize push notifications
 * - Request notification permission
 * - Auto-refresh expired tokens (iOS fix)
 * - Get notification status
 */

'use client';

import { useEffect, useState } from 'react';
import { getMessaging } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';
import {
  isPushNotificationSupported,
  initializePushNotifications,
  autoRefreshPushToken,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/firebase/messaging';
import { logger } from '@/lib/logger';

export interface UsePushNotificationsResult {
  /** Whether push notifications are supported */
  isSupported: boolean;
  /** Current notification permission status */
  permission: NotificationPermission;
  /** Whether push notifications are initialized */
  isInitialized: boolean;
  /** Whether initialization is in progress */
  isLoading: boolean;
  /** Initialization error if any */
  error: Error | null;
  /** Request notification permission from user */
  requestPermission: () => Promise<NotificationPermission>;
  /** Initialize push notifications */
  initialize: () => Promise<void>;
}

/**
 * Hook for managing push notifications
 *
 * @param participantId - Current user's participant ID
 * @param userEnabled - Whether user has enabled push notifications (from Firestore)
 * @returns Push notification state and methods
 *
 * @example
 * ```tsx
 * const { isSupported, permission, requestPermission } = usePushNotifications(userId, true);
 *
 * if (isSupported && permission === 'default') {
 *   return <button onClick={requestPermission}>Enable Notifications</button>;
 * }
 * ```
 */
export function usePushNotifications(
  participantId: string | undefined,
  userEnabled = false
): UsePushNotificationsResult {
  const [isSupported] = useState(() => isPushNotificationSupported());
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? getNotificationPermission() : 'denied'
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);

  /**
   * Request notification permission
   */
  const requestPermission = async (): Promise<NotificationPermission> => {
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      return newPermission;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error('Error requesting notification permission', error);
      setError(error);
      return 'denied';
    }
  };

  /**
   * Initialize push notifications
   */
  const initialize = async (): Promise<void> => {
    if (!isSupported || !participantId || isInitialized) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check FCM support before creating messaging instance
      const { isFCMSupported } = await import('@/lib/firebase/webpush');
      const fcmSupported = await isFCMSupported();
      const messaging = fcmSupported ? getMessaging(getFirebaseApp()) : null;

      // Initialize push notifications (FCM + Web Push)
      const initResult = await initializePushNotifications(messaging, participantId);

      if (initResult) {
        setCleanup(() => initResult.cleanup);
      }

      // Auto-refresh token (only for FCM-supported platforms)
      await autoRefreshPushToken(messaging, participantId);

      setIsInitialized(true);
      logger.info('Push notifications initialized successfully', { participantId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize push notifications');
      logger.error('Error initializing push notifications', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-initialize on mount (only if user has enabled notifications)
   */
  useEffect(() => {
    if (userEnabled && participantId && permission === 'granted' && !isInitialized) {
      initialize();
    }
  }, [userEnabled, participantId, permission, isInitialized]);

  /**
   * Auto-refresh token on mount and periodically (iOS fix)
   * iOS PWA tokens expire after 1-2 weeks, so we check on every app open
   * AND every 7 days while the app is open (belt and suspenders approach)
   */
  useEffect(() => {
    if (!userEnabled || !isSupported || !participantId || permission !== 'granted') {
      return;
    }

    // ✅ Check token immediately on mount (iOS PWA fix)
    // This handles the case where the app was closed for >7 days
    const checkTokenOnMount = async () => {
      try {
        // Check FCM support before creating messaging instance
        const { isFCMSupported } = await import('@/lib/firebase/webpush');
        const fcmSupported = await isFCMSupported();
        const messaging = fcmSupported ? getMessaging(getFirebaseApp()) : null;

        logger.info('[usePushNotifications] Checking token on mount for iOS PWA...', { participantId });
        await autoRefreshPushToken(messaging, participantId);
        logger.info('[usePushNotifications] Token check on mount completed', { participantId });
      } catch (error) {
        logger.error('[usePushNotifications] Error checking token on mount', error);
      }
    };

    checkTokenOnMount();

    // ✅ Also refresh periodically while app is open (additional safety)
    const interval = setInterval(
      async () => {
        try {
          // Check FCM support before creating messaging instance
          const { isFCMSupported } = await import('@/lib/firebase/webpush');
          const fcmSupported = await isFCMSupported();
          const messaging = fcmSupported ? getMessaging(getFirebaseApp()) : null;

          await autoRefreshPushToken(messaging, participantId);
          logger.info('[usePushNotifications] Auto-refreshed push token (interval)', { participantId });
        } catch (error) {
          logger.error('[usePushNotifications] Error auto-refreshing push token', error);
        }
      },
      7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    );

    return () => clearInterval(interval);
  }, [userEnabled, isSupported, participantId, permission]);

  /**
   * Cleanup on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (cleanup) {
        cleanup();
        logger.info('Push notification listener cleaned up');
      }
    };
  }, [cleanup]);

  return {
    isSupported,
    permission,
    isInitialized,
    isLoading,
    error,
    requestPermission,
    initialize,
  };
}
