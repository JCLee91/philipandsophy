/**
 * Server-side Push Notification Sender
 *
 * Uses Firebase Admin SDK to send push notifications to users
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { PushTokenEntry } from '@/types/database';

/**
 * Initialize Firebase Admin (if not already initialized)
 */
function initializeAdmin() {
  if (admin.apps.length === 0) {
    // ✅ 환경 변수 필수 (보안 강화)
    if (!process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error(
        'Firebase Admin SDK credentials not found. ' +
        'Required environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return admin;
}

/**
 * Push notification payload
 */
export interface PushNotificationPayload {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Icon URL (optional) */
  icon?: string;
  /** Badge icon URL (optional) */
  badge?: string;
  /** Click action URL (optional) */
  url?: string;
  /** Notification type for categorization */
  type?: 'dm' | 'notice' | 'matching' | 'general';
  /** Additional custom data */
  data?: Record<string, string>;
  /** Unique tag/ID for Android notification stacking (optional, auto-generated if not provided) */
  tag?: string;
}

/**
 * Send push notification to a single user (all devices)
 *
 * ✅ Updated to use pushTokens array for multi-device support
 *
 * @param participantId - Participant ID
 * @param payload - Notification payload
 * @returns Success status (true if sent to at least one device)
 */
export async function sendPushToUser(
  participantId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    initializeAdmin();
    const db = getFirestore();

    // Get user's push tokens from Firestore
    const participantRef = db.collection('participants').doc(participantId);
    const participantSnap = await participantRef.get();

    if (!participantSnap.exists) {

      return false;
    }

    const participantData = participantSnap.data();

    // ✅ Check pushNotificationEnabled flag first
    if (participantData?.pushNotificationEnabled === false) {

      return false;
    }

    // ✅ Priority 1: Get tokens from pushTokens array
    const pushTokens: PushTokenEntry[] = participantData?.pushTokens || [];
    const tokens = pushTokens.map((entry) => entry.token);

    // ✅ Priority 2: Fallback to legacy pushToken if array is empty
    if (tokens.length === 0 && participantData?.pushToken) {
      tokens.push(participantData.pushToken);

    }

    if (tokens.length === 0) {

      return false;
    }

    // ✅ Generate unique tag for Android notification stacking
    const notificationTag = payload.tag || `${payload.type || 'general'}-${Date.now()}`;

    // ✅ Data-only message (Service Worker에서 수동 표시)
    // notification 필드 제거로 FCM 자동 표시 방지 → 중복 알림 해결
    const message: admin.messaging.MulticastMessage = {
      tokens,
      data: {
        // ✅ title, body를 data에 포함 (SW에서 읽음)
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/image/favicon.webp',
        badge: payload.badge || '/image/favicon.webp',
        url: payload.url || '/app/chat',
        type: payload.type || 'general',
        tag: notificationTag,
        ...payload.data,
      },
      // ✅ Android 설정 (data-only에도 적용)
      android: {
        priority: 'high' as const,
      },
      // ✅ Web Push 설정
      webpush: {
        headers: {
          Urgency: 'high',
        },
      },
    };

    // Send push notification to all devices
    const response = await admin.messaging().sendEachForMulticast(message);

    // ✅ Handle failed tokens (remove invalid/expired tokens)
    if (response.failureCount > 0) {
      const failedTokenEntries: PushTokenEntry[] = [];

      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;

          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            // Find the token entry to remove
            const failedToken = tokens[index];
            const tokenEntry = pushTokens.find((entry) => entry.token === failedToken);

            if (tokenEntry) {
              failedTokenEntries.push(tokenEntry);

            }
          }
        }
      });

      // Remove failed tokens from pushTokens array
      if (failedTokenEntries.length > 0) {
        await db
          .collection('participants')
          .doc(participantId)
          .update({
            pushTokens: admin.firestore.FieldValue.arrayRemove(...failedTokenEntries),
          });

        // ✅ If all tokens removed, disable push notifications
        const remainingTokens = pushTokens.filter(
          (entry) => !failedTokenEntries.some((failed) => failed.deviceId === entry.deviceId)
        );

        if (remainingTokens.length === 0) {
          await db
            .collection('participants')
            .doc(participantId)
            .update({
              pushNotificationEnabled: false,
            });

        }
      }
    }

    return response.successCount > 0;
  } catch (error: any) {

    return false;
  }
}

/**
 * Send push notification to multiple users (all their devices)
 *
 * ✅ Updated to use pushTokens array for multi-device support
 *
 * @param participantIds - Array of participant IDs
 * @param payload - Notification payload
 * @returns Number of successful sends
 */
export async function sendPushToMultipleUsers(
  participantIds: string[],
  payload: PushNotificationPayload
): Promise<number> {
  try {
    initializeAdmin();
    const db = getFirestore();

    // ✅ Get all push tokens from pushTokens array
    const tokens: string[] = [];
    const tokenToParticipantMap = new Map<string, { participantId: string; tokenEntry: PushTokenEntry | null }>(); // token -> participant info

    for (const participantId of participantIds) {
      const participantRef = db.collection('participants').doc(participantId);
      const participantSnap = await participantRef.get();

      if (participantSnap.exists) {
        const participantData = participantSnap.data();

        // ✅ Skip if push notifications are disabled
        if (participantData?.pushNotificationEnabled === false) {

          continue;
        }

        // ✅ Priority 1: Get tokens from pushTokens array
        const pushTokens: PushTokenEntry[] = participantData?.pushTokens || [];

        pushTokens.forEach((entry) => {
          tokens.push(entry.token);
          tokenToParticipantMap.set(entry.token, {
            participantId,
            tokenEntry: entry, // Store the actual Firestore entry
          });
        });

        // ✅ Priority 2: Fallback to legacy pushToken
        if (pushTokens.length === 0 && participantData?.pushToken) {
          tokens.push(participantData.pushToken);
          tokenToParticipantMap.set(participantData.pushToken, {
            participantId,
            tokenEntry: null, // Legacy token has no entry object
          });

        }
      }
    }

    if (tokens.length === 0) {

      return 0;
    }

    // ✅ Generate unique tag for Android notification stacking
    const notificationTag = payload.tag || `${payload.type || 'general'}-${Date.now()}`;

    // ✅ Data-only message (Service Worker에서 수동 표시)
    const message: admin.messaging.MulticastMessage = {
      tokens,
      data: {
        // ✅ title, body를 data에 포함
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/image/favicon.webp',
        badge: payload.badge || '/image/favicon.webp',
        url: payload.url || '/app/chat',
        type: payload.type || 'general',
        tag: notificationTag,
        ...payload.data,
      },
      android: {
        priority: 'high' as const,
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
      },
    };

    // Send multicast push notification
    const response = await admin.messaging().sendEachForMulticast(message);

    // ✅ Handle failed tokens (remove invalid/expired tokens)
    const failedTokensByParticipant = new Map<string, PushTokenEntry[]>();

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;

        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          const failedToken = tokens[index];
          const participantInfo = tokenToParticipantMap.get(failedToken);

          if (participantInfo) {
            const { participantId, tokenEntry } = participantInfo;

            if (!failedTokensByParticipant.has(participantId)) {
              failedTokensByParticipant.set(participantId, []);
            }

            // Only add if we have the actual token entry (not legacy)
            if (tokenEntry) {
              // Use the actual Firestore entry for arrayRemove to work correctly
              failedTokensByParticipant.get(participantId)!.push(tokenEntry);
            }

          }
        }
      }
    });

    // Remove failed tokens from database (batch operation)
    if (failedTokensByParticipant.size > 0) {
      const batch = db.batch();

      for (const [participantId, failedTokenEntries] of failedTokensByParticipant.entries()) {
        const participantRef = db.collection('participants').doc(participantId);

        // Remove failed tokens from pushTokens array
        batch.update(participantRef, {
          pushTokens: admin.firestore.FieldValue.arrayRemove(...failedTokenEntries),
        });

        // Note: We'll need a separate query to check if all tokens are removed
        // and update pushNotificationEnabled in a follow-up operation
      }

      await batch.commit();

      // ✅ Check if participants have no tokens left and disable push notifications
      for (const participantId of failedTokensByParticipant.keys()) {
        const participantRef = db.collection('participants').doc(participantId);
        const participantSnap = await participantRef.get();

        if (participantSnap.exists) {
          const remainingTokens: PushTokenEntry[] = participantSnap.data()?.pushTokens || [];

          if (remainingTokens.length === 0) {
            await participantRef.update({
              pushNotificationEnabled: false,
            });

          }
        }
      }

    }

    return response.successCount;
  } catch (error) {

    return 0;
  }
}

/**
 * Send push notification to all cohort members
 *
 * @param cohortId - Cohort ID
 * @param payload - Notification payload
 * @param excludeAdmins - Exclude admin users (default: true)
 * @returns Number of successful sends
 */
export async function sendPushToCohort(
  cohortId: string,
  payload: PushNotificationPayload,
  excludeAdmins = true
): Promise<number> {
  try {
    initializeAdmin();
    const db = getFirestore();

    // Get all cohort participants
    let query = db.collection('participants').where('cohortId', '==', cohortId);

    if (excludeAdmins) {
      query = query.where('isAdministrator', '==', false);
    }

    const snapshot = await query.get();
    const participantIds = snapshot.docs.map((doc) => doc.id);

    if (participantIds.length === 0) {

      return 0;
    }

    return await sendPushToMultipleUsers(participantIds, payload);
  } catch (error) {

    return 0;
  }
}
