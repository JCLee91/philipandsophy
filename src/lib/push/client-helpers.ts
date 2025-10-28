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
import { isPushEnabledForDevice } from './helpers';

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

    return false;
  }

  // Get deviceId from localStorage (client-only)
  let deviceId: string;
  try {
    deviceId = localStorage.getItem('device-id') || '';
  } catch (error) {

    return false;
  }

  if (!deviceId) {

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

    return '';
  }
}
