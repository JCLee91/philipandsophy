/**
 * Push Notification Client Helpers
 *
 * Purpose:
 * - Client-side only push notification helpers
 * - Requires browser APIs (localStorage, navigator, etc.)
 *
 * Usage:
 * - Import from components/hooks only (NOT from API routes)
 */

'use client';

import { logger } from '@/lib/logger';

/**
 * Check if push is enabled for current device (client-side)
 *
 * This is a client-side wrapper that:
 * 1. Gets current deviceId from localStorage
 * 2. Calls server-safe isPushEnabledForDevice helper
 *
 * @param data - Participant data from Firestore
 * @returns true if current device has push enabled
 */
export function isPushEnabledForCurrentDevice(data: any): boolean {
  if (typeof window === 'undefined') {
    logger.warn('[isPushEnabledForCurrentDevice] Called on server, returning false');
    return false;
  }

  // Import server-safe helper
  const { isPushEnabledForDevice } = require('./helpers');

  // Get deviceId from localStorage (client-only)
  let deviceId: string;
  try {
    deviceId = localStorage.getItem('device-id') || '';
  } catch (error) {
    logger.warn('[isPushEnabledForCurrentDevice] localStorage unavailable', error);
    return false;
  }

  if (!deviceId) {
    logger.warn('[isPushEnabledForCurrentDevice] No deviceId found');
    return false;
  }

  return isPushEnabledForDevice(data, deviceId);
}

/**
 * Get current device ID from localStorage
 *
 * Client-side only function to retrieve deviceId.
 * Returns empty string if unavailable.
 *
 * @returns Device ID string
 */
export function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return localStorage.getItem('device-id') || '';
  } catch (error) {
    logger.warn('[getCurrentDeviceId] localStorage unavailable', error);
    return '';
  }
}
