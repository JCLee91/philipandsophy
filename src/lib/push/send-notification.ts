/**
 * Server-side Push Notification Sender
 *
 * Uses Firebase Admin SDK to send push notifications to users
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * Initialize Firebase Admin (if not already initialized)
 */
function initializeAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccount = require('../../../firebase-service-account.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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
}

/**
 * Send push notification to a single user
 *
 * @param participantId - Participant ID
 * @param payload - Notification payload
 * @returns Success status
 */
export async function sendPushToUser(
  participantId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    initializeAdmin();
    const db = getFirestore();

    // Get user's push token from Firestore
    const participantRef = db.collection('participants').doc(participantId);
    const participantSnap = await participantRef.get();

    if (!participantSnap.exists) {
      logger.warn('Participant not found', { participantId });
      return false;
    }

    const pushToken = participantSnap.data()?.pushToken;

    if (!pushToken) {
      logger.warn('Push token not found for participant', { participantId });
      return false;
    }

    // Prepare FCM message
    const message: admin.messaging.Message = {
      token: pushToken,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon || '/image/favicon.webp',
      },
      data: {
        url: payload.url || '/app/chat',
        type: payload.type || 'general',
        ...payload.data,
      },
      webpush: {
        notification: {
          icon: payload.icon || '/image/favicon.webp',
          badge: payload.badge || '/image/favicon.webp',
          requireInteraction: false,
        },
        fcmOptions: {
          link: payload.url || '/app/chat',
        },
      },
    };

    // Send push notification
    const response = await admin.messaging().send(message);
    logger.info('Push notification sent successfully', {
      participantId,
      messageId: response,
      type: payload.type,
    });

    return true;
  } catch (error: any) {
    // Handle token expiration (iOS issue)
    if (error.code === 'messaging/registration-token-not-registered') {
      logger.warn('Push token expired, removing from database', { participantId });

      try {
        const db = getFirestore();
        await db.collection('participants').doc(participantId).update({
          pushToken: admin.firestore.FieldValue.delete(),
        });
      } catch (deleteError) {
        logger.error('Error removing expired push token', deleteError);
      }

      return false;
    }

    logger.error('Error sending push notification', {
      error,
      participantId,
      type: payload.type,
    });
    return false;
  }
}

/**
 * Send push notification to multiple users
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

    // Get all push tokens
    const tokens: string[] = [];
    const tokenMap = new Map<string, string>(); // token -> participantId

    for (const participantId of participantIds) {
      const participantRef = db.collection('participants').doc(participantId);
      const participantSnap = await participantRef.get();

      if (participantSnap.exists) {
        const pushToken = participantSnap.data()?.pushToken;
        if (pushToken) {
          tokens.push(pushToken);
          tokenMap.set(pushToken, participantId);
        }
      }
    }

    if (tokens.length === 0) {
      logger.warn('No valid push tokens found', { participantCount: participantIds.length });
      return 0;
    }

    // Prepare multicast message
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon || '/image/favicon.webp',
      },
      data: {
        url: payload.url || '/app/chat',
        type: payload.type || 'general',
        ...payload.data,
      },
      webpush: {
        notification: {
          icon: payload.icon || '/image/favicon.webp',
          badge: payload.badge || '/image/favicon.webp',
          requireInteraction: false,
        },
        fcmOptions: {
          link: payload.url || '/app/chat',
        },
      },
    };

    // Send multicast push notification
    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle expired tokens
    const expiredTokens: string[] = [];
    response.responses.forEach((resp, index) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        expiredTokens.push(tokens[index]);
      }
    });

    // Remove expired tokens from database
    if (expiredTokens.length > 0) {
      logger.warn('Removing expired push tokens', { count: expiredTokens.length });

      const batch = db.batch();
      expiredTokens.forEach((token) => {
        const participantId = tokenMap.get(token);
        if (participantId) {
          const participantRef = db.collection('participants').doc(participantId);
          batch.update(participantRef, {
            pushToken: admin.firestore.FieldValue.delete(),
          });
        }
      });

      await batch.commit();
    }

    logger.info('Multicast push notification sent', {
      totalTokens: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      type: payload.type,
    });

    return response.successCount;
  } catch (error) {
    logger.error('Error sending multicast push notification', {
      error,
      participantCount: participantIds.length,
      type: payload.type,
    });
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
      logger.warn('No participants found in cohort', { cohortId });
      return 0;
    }

    return await sendPushToMultipleUsers(participantIds, payload);
  } catch (error) {
    logger.error('Error sending push to cohort', { error, cohortId });
    return 0;
  }
}
