/**
 * Push Notification Helpers - Unified Logic (Server-Safe)
 *
 * Purpose:
 * - Provide consistent push status detection across all platforms (FCM + Web Push)
 * - Manage device-specific push tokens/subscriptions
 * - Ensure FCM and Web Push are treated equally
 *
 * Design:
 * - Single Source of Truth: Firestore participant document
 * - Platform-agnostic: Works for Android (FCM), iOS (Web Push), Desktop (both)
 * - Device-aware: Uses deviceId for multi-device support
 * - Server-Safe: No 'use client' directive, can be used in API routes
 */

import type { PushTokenEntry, WebPushSubscriptionData } from '@/types/database';

/**
 * Check if participant has any valid push subscription
 *
 * This checks:
 * 1. pushTokens array (FCM, modern multi-device)
 * 2. webPushSubscriptions array (Web Push, iOS Safari + all platforms)
 * 3. pushToken field (legacy single FCM token, fallback only)
 *
 * @param data - Participant data from Firestore
 * @returns true if ANY valid push subscription exists
 */
export function hasAnyPushSubscription(data: any): boolean {
  // ✅ Priority 1: Check modern arrays first
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

  // ✅ Priority 2: Fallback to legacy field ONLY if arrays don't exist
  // If arrays exist but are empty, ignore legacy field (data migration complete)
  const arraysExist =
    (Array.isArray(data.pushTokens) && data.pushTokens.length > 0) ||
    (Array.isArray(data.webPushSubscriptions) && data.webPushSubscriptions.length > 0);

  const hasLegacyToken =
    !arraysExist &&
    typeof data.pushToken === 'string' &&
    data.pushToken.trim().length > 0;

  return hasMultiDeviceToken || hasWebPushSubscription || hasLegacyToken;
}

/**
 * Check if push is enabled for current device
 *
 * This checks if the CURRENT device has an active push subscription.
 * Returns true if either FCM token or Web Push subscription exists for this device.
 *
 * @param data - Participant data from Firestore
 * @param deviceId - Current device ID
 * @returns true if current device has push enabled
 */
export function isPushEnabledForDevice(data: any, deviceId: string): boolean {
  if (!deviceId) {
    return false;
  }

  // Check pushNotificationEnabled flag (user preference)
  if (data.pushNotificationEnabled === false) {
    return false;
  }

  // ✅ Check FCM token for current device
  const pushTokens: PushTokenEntry[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
  const hasFCMToken = pushTokens.some(
    (entry) => entry.deviceId === deviceId && typeof entry.token === 'string' && entry.token.trim().length > 0
  );

  // ✅ Check Web Push subscription for current device
  const webPushSubs: WebPushSubscriptionData[] = Array.isArray(data.webPushSubscriptions)
    ? data.webPushSubscriptions
    : [];
  const hasWebPush = webPushSubs.some(
    (sub) => sub.deviceId === deviceId && typeof sub.endpoint === 'string' && sub.endpoint.trim().length > 0
  );

  return hasFCMToken || hasWebPush;
}

/**
 * Get all device IDs that have push enabled
 *
 * Returns a list of deviceIds that have either FCM or Web Push active.
 * Useful for admin dashboards to see how many devices a user has registered.
 *
 * @param data - Participant data from Firestore
 * @returns Array of device IDs with push enabled
 */
export function getEnabledPushDevices(data: any): string[] {
  const deviceIds = new Set<string>();

  // Collect from FCM tokens
  const pushTokens: PushTokenEntry[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
  pushTokens.forEach((entry) => {
    if (entry.deviceId && typeof entry.token === 'string' && entry.token.trim().length > 0) {
      deviceIds.add(entry.deviceId);
    }
  });

  // Collect from Web Push subscriptions
  const webPushSubs: WebPushSubscriptionData[] = Array.isArray(data.webPushSubscriptions)
    ? data.webPushSubscriptions
    : [];
  webPushSubs.forEach((sub) => {
    if (sub.deviceId && typeof sub.endpoint === 'string' && sub.endpoint.trim().length > 0) {
      deviceIds.add(sub.deviceId);
    }
  });

  return Array.from(deviceIds);
}

/**
 * Get push token/subscription count by type
 *
 * Returns statistics about push subscriptions:
 * - fcmCount: Number of FCM tokens
 * - webPushCount: Number of Web Push subscriptions
 * - totalDevices: Unique device count (union of both)
 *
 * @param data - Participant data from Firestore
 * @returns Push subscription statistics
 */
export function getPushSubscriptionStats(data: any): {
  fcmCount: number;
  webPushCount: number;
  totalDevices: number;
} {
  const pushTokens: PushTokenEntry[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
  const webPushSubs: WebPushSubscriptionData[] = Array.isArray(data.webPushSubscriptions)
    ? data.webPushSubscriptions
    : [];

  const fcmCount = pushTokens.filter(
    (entry) => typeof entry.token === 'string' && entry.token.trim().length > 0
  ).length;

  const webPushCount = webPushSubs.filter(
    (sub) => typeof sub.endpoint === 'string' && sub.endpoint.trim().length > 0
  ).length;

  const totalDevices = getEnabledPushDevices(data).length;

  return { fcmCount, webPushCount, totalDevices };
}

/**
 * Validate if push token/subscription is recent
 *
 * Checks if the token/subscription was updated within the last N days.
 * Useful for detecting stale tokens that need refresh.
 *
 * @param updatedAt - Timestamp of last update
 * @param maxAgeDays - Maximum age in days (default: 30)
 * @returns true if token is recent
 */
export function isPushTokenRecent(updatedAt: Date | undefined, maxAgeDays = 30): boolean {
  if (!updatedAt) return false;

  const now = new Date();
  const ageMs = now.getTime() - updatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  return ageDays <= maxAgeDays;
}

/**
 * Check if push is enabled for specific Web Push endpoint
 *
 * This is more reliable than deviceId-based checking because:
 * - endpoint is generated and managed by the browser
 * - endpoint never changes (unlike deviceId which depends on localStorage)
 * - No localStorage dependency (works in Safari Private Mode)
 * - Perfect for iOS Safari PWA
 *
 * @param data - Participant data from Firestore
 * @param endpoint - Web Push subscription endpoint
 * @returns true if this endpoint has push enabled
 */
export function isPushEnabledForEndpoint(data: any, endpoint: string): boolean {
  if (!endpoint) {
    return false;
  }

  // Check pushNotificationEnabled flag (user preference)
  if (data.pushNotificationEnabled === false) {
    return false;
  }

  // ✅ Check Web Push subscription for current endpoint
  const webPushSubs: WebPushSubscriptionData[] = Array.isArray(data.webPushSubscriptions)
    ? data.webPushSubscriptions
    : [];

  return webPushSubs.some(
    (sub) => sub.endpoint === endpoint && typeof sub.endpoint === 'string' && sub.endpoint.trim().length > 0
  );
}
