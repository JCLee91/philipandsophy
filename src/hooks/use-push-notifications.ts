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
 * @param enabled - Whether to auto-initialize push notifications
 * @returns Push notification state and methods
 *
 * @example
 * ```tsx
 * const { isSupported, permission, requestPermission } = usePushNotifications(userId);
 *
 * if (isSupported && permission === 'default') {
 *   return <button onClick={requestPermission}>Enable Notifications</button>;
 * }
 * ```
 */
export function usePushNotifications(
  participantId: string | undefined,
  enabled = true
): UsePushNotificationsResult {
  const [isSupported] = useState(() => isPushNotificationSupported());
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? getNotificationPermission() : 'denied'
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

      const messaging = getMessaging(getFirebaseApp());

      // Initialize push notifications
      await initializePushNotifications(messaging, participantId);

      // Auto-refresh token (iOS fix)
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
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (enabled && participantId && permission === 'granted' && !isInitialized) {
      initialize();
    }
  }, [enabled, participantId, permission, isInitialized]);

  /**
   * Auto-refresh token periodically (iOS fix)
   */
  useEffect(() => {
    if (!enabled || !isSupported || !participantId || permission !== 'granted') {
      return;
    }

    // Refresh token every 7 days
    const interval = setInterval(
      async () => {
        try {
          const messaging = getMessaging(getFirebaseApp());
          await autoRefreshPushToken(messaging, participantId);
          logger.info('Auto-refreshed push token', { participantId });
        } catch (error) {
          logger.error('Error auto-refreshing push token', error);
        }
      },
      7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    );

    return () => clearInterval(interval);
  }, [enabled, isSupported, participantId, permission]);

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
