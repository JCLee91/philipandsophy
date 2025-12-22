/**
 * Common helper utilities for Firebase Cloud Functions
 */

import * as admin from "firebase-admin";
import { getDefaultDb } from "./db-helper";

/**
 * Truncate long text for notifications
 */
export function truncateContent(content: string, maxLength = 100): string {
  return content.length > maxLength
    ? `${content.substring(0, maxLength)}...`
    : content;
}

/**
 * Safely truncate token for logging (security best practice)
 */
export function truncateToken(token: string): string {
  return `${token.substring(0, 20)}...`;
}

/**
 * Get all participants in cohort (including admins)
 */
export async function getCohortParticipants(
  cohortId: string
): Promise<admin.firestore.QuerySnapshot<admin.firestore.DocumentData>> {
  return getDefaultDb()
    .collection("participants")
    .where("cohortId", "==", cohortId)
    .get();
}

/**
 * Push token entry type (FCM)
 */
export interface PushTokenEntry {
  deviceId: string;
  token: string;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Web Push subscription data type (Standard Web Push API)
 */
export interface WebPushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceId: string;
  userAgent: string;
  createdAt: admin.firestore.Timestamp | Date;
  lastUsedAt?: admin.firestore.Timestamp | Date;
}

/**
 * Get push tokens and subscriptions for a participant (Dual-path support)
 *
 * ✅ Updated to support both FCM tokens and Web Push subscriptions
 *
 * @returns Object with FCM tokens, entries map, and Web Push subscriptions
 */
export async function getPushTokens(participantId: string): Promise<{
  tokens: string[];
  entriesMap: Map<string, PushTokenEntry | null>;
  webPushSubscriptions: WebPushSubscriptionData[];
}> {
  try {
    const participantDoc = await getDefaultDb()
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantDoc.exists) {
      return {
        tokens: [],
        entriesMap: new Map(),
        webPushSubscriptions: [],
      };
    }

    const data = participantDoc.data();
    if (!data) {
      return {
        tokens: [],
        entriesMap: new Map(),
        webPushSubscriptions: [],
      };
    }

    // 1. FCM tokens (legacy single field)
    const legacyToken = data.pushToken as string | undefined;

    // 2. FCM tokens array (new field)
    const tokensArray = (data.pushTokens as PushTokenEntry[] | undefined) || [];

    // 3. Web Push subscriptions array
    const webPushSubscriptions =
      (data.webPushSubscriptions as WebPushSubscriptionData[] | undefined) ||
      [];

    // Combine legacy token with new tokens
    const allTokens = legacyToken
      ? [legacyToken, ...tokensArray.map((t) => t.token)]
      : tokensArray.map((t) => t.token);

    // Deduplicate tokens
    const uniqueTokens = Array.from(new Set(allTokens));

    // Create map for token entries (for detailed logging)
    const entriesMap = new Map<string, PushTokenEntry | null>();
    tokensArray.forEach((entry) => {
      entriesMap.set(entry.token, entry);
    });
    if (legacyToken && !entriesMap.has(legacyToken)) {
      entriesMap.set(legacyToken, null); // Legacy token has no entry
    }

    return {
      tokens: uniqueTokens,
      entriesMap,
      webPushSubscriptions,
    };
  } catch (error) {
    console.error(
      `Error getting push tokens for participant ${participantId}:`,
      error
    );
    return {
      tokens: [],
      entriesMap: new Map(),
      webPushSubscriptions: [],
    };
  }
}
