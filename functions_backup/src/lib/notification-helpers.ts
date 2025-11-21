/**
 * Notification helper functions
 * Shared utilities for push notifications across all triggers
 */

import * as admin from "firebase-admin";
import * as webpush from "web-push";
import { logger } from "./logger";
import { getSeoulDB } from "./db-helper";
import { NOTIFICATION_CONFIG } from "../constants/notifications";

// Configure Web Push VAPID
const WEBPUSH_VAPID_PUBLIC_KEY = process.env.WEBPUSH_VAPID_PUBLIC_KEY;
const WEBPUSH_VAPID_PRIVATE_KEY = process.env.WEBPUSH_VAPID_PRIVATE_KEY;

const IS_WEBPUSH_CONFIGURED = Boolean(
  WEBPUSH_VAPID_PUBLIC_KEY && WEBPUSH_VAPID_PRIVATE_KEY
);

if (IS_WEBPUSH_CONFIGURED) {
  webpush.setVapidDetails(
    "mailto:noreply@philipandsophy.com",
    WEBPUSH_VAPID_PUBLIC_KEY!,
    WEBPUSH_VAPID_PRIVATE_KEY!
  );
} else {
  logger.warn(
    "Web Push VAPID keys are not configured. Web Push notifications will be skipped."
  );
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
 * Web Push subscription data type
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
 * Truncate long text for notifications
 */
export function truncateContent(content: string, maxLength = 100): string {
  return content.length > maxLength
    ? `${content.substring(0, maxLength)}...`
    : content;
}

/**
 * Safely truncate token for logging
 */
function truncateToken(token: string): string {
  return `${token.substring(0, 20)}...`;
}

/**
 * Get all participants in cohort
 */
export async function getCohortParticipants(
  cohortId: string
): Promise<admin.firestore.QuerySnapshot<admin.firestore.DocumentData>> {
  return getSeoulDB()
    .collection("participants")
    .where("cohortId", "==", cohortId)
    .get();
}

/**
 * Get all administrators (super admins + general admins)
 */
export async function getAllAdministrators(): Promise<admin.firestore.QuerySnapshot<admin.firestore.DocumentData>> {
  const db = getSeoulDB();

  const superAdminsQuery = db
    .collection("participants")
    .where("isSuperAdmin", "==", true);

  const generalAdminsQuery = db
    .collection("participants")
    .where("isAdministrator", "==", true);

  const [superAdminsSnapshot, generalAdminsSnapshot] = await Promise.all([
    superAdminsQuery.get(),
    generalAdminsQuery.get(),
  ]);

  const adminMap = new Map<string, admin.firestore.QueryDocumentSnapshot>();

  superAdminsSnapshot.docs.forEach((doc) => {
    adminMap.set(doc.id, doc);
  });

  generalAdminsSnapshot.docs.forEach((doc) => {
    adminMap.set(doc.id, doc);
  });

  return {
    docs: Array.from(adminMap.values()),
    size: adminMap.size,
    empty: adminMap.size === 0,
  } as admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;
}

/**
 * Get participant name
 */
export async function getParticipantName(participantId: string): Promise<string> {
  try {
    const db = getSeoulDB();
    const participantDoc = await db
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantDoc.exists) {
      return "참가자";
    }

    return participantDoc.data()?.name || "참가자";
  } catch (error) {
    logger.error(`Error getting participant name for ${participantId}`, error as Error);
    return "참가자";
  }
}

/**
 * Get push tokens and subscriptions for a participant
 */
export async function getPushTokens(participantId: string): Promise<{
  tokens: string[];
  entriesMap: Map<string, PushTokenEntry | null>;
  webPushSubscriptions: WebPushSubscriptionData[];
}> {
  try {
    const db = getSeoulDB();
    const participantDoc = await db
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantDoc.exists) {
      logger.warn(`Participant not found: ${participantId}`);
      return { tokens: [], entriesMap: new Map(), webPushSubscriptions: [] };
    }

    const participantData = participantDoc.data();

    if (participantData?.pushNotificationEnabled === false) {
      logger.debug(`Push notifications disabled for participant: ${participantId}`);
      return { tokens: [], entriesMap: new Map(), webPushSubscriptions: [] };
    }

    const pushTokens: PushTokenEntry[] = participantData?.pushTokens || [];
    const tokens: string[] = [];
    const entriesMap = new Map<string, PushTokenEntry | null>();

    pushTokens.forEach((entry) => {
      tokens.push(entry.token);
      entriesMap.set(entry.token, entry);
    });

    const webPushSubscriptions: WebPushSubscriptionData[] =
      participantData?.webPushSubscriptions || [];

    return { tokens, entriesMap, webPushSubscriptions };
  } catch (error) {
    logger.error(`Error getting push tokens for ${participantId}`, error as Error);
    return { tokens: [], entriesMap: new Map(), webPushSubscriptions: [] };
  }
}

/**
 * Send Web Push notifications
 */
async function sendWebPushNotifications(
  participantId: string,
  subscriptions: WebPushSubscriptionData[],
  title: string,
  body: string,
  url: string,
  type: string
): Promise<number> {
  if (subscriptions.length === 0) {
    return 0;
  }

  if (!IS_WEBPUSH_CONFIGURED) {
    logger.warn("Web Push configuration missing, skipping Web Push delivery");
    return 0;
  }

  let successCount = 0;
  const failedSubscriptions: WebPushSubscriptionData[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon: NOTIFICATION_CONFIG.ICON_PATH,
          badge: NOTIFICATION_CONFIG.BADGE_PATH,
          data: {
            url,
            type,
          },
        });

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          payload
        );

        successCount++;
        logger.info(`Web Push sent successfully`, {
          participantId,
          deviceId: subscription.deviceId,
        });
      } catch (error: any) {
        const statusCode = error?.statusCode;

        if (statusCode === 410 || statusCode === 404) {
          failedSubscriptions.push(subscription);
          logger.warn(`Web Push subscription expired/invalid`, {
            participantId,
            deviceId: subscription.deviceId,
            statusCode,
          });
        } else {
          logger.error(`Web Push send failed`, {
            participantId,
            deviceId: subscription.deviceId,
            error: error.message,
            statusCode,
          });
        }
      }
    })
  );

  if (failedSubscriptions.length > 0) {
    await removeExpiredWebPushSubscriptions(participantId, failedSubscriptions);
  }

  return successCount;
}

/**
 * Remove expired Web Push subscriptions
 */
async function removeExpiredWebPushSubscriptions(
  participantId: string,
  failedSubscriptions: WebPushSubscriptionData[]
): Promise<void> {
  try {
    const db = getSeoulDB();
    const participantRef = db
      .collection("participants")
      .doc(participantId);

    await participantRef.update({
      webPushSubscriptions: admin.firestore.FieldValue.arrayRemove(...failedSubscriptions),
    });

    logger.info(`Removed ${failedSubscriptions.length} expired Web Push subscriptions`, {
      participantId,
    });

    const participantSnap = await participantRef.get();
    const participantData = participantSnap.data();
    const remainingWebPush = participantData?.webPushSubscriptions || [];
    const remainingFCM = participantData?.pushTokens || [];

    if (remainingWebPush.length === 0 && remainingFCM.length === 0) {
      await participantRef.update({
        pushNotificationEnabled: false,
      });
      logger.info(`All push subscriptions invalid, disabled push notifications`, {
        participantId,
      });
    }
  } catch (error) {
    logger.error(`Error removing expired Web Push subscriptions`, error as Error);
  }
}

/**
 * Send push notifications (Dual-path: FCM + Web Push)
 */
export async function sendPushNotificationMulticast(
  participantId: string,
  tokens: string[],
  entriesMap: Map<string, PushTokenEntry | null>,
  webPushSubscriptions: WebPushSubscriptionData[],
  title: string,
  body: string,
  url: string,
  type: string
): Promise<number> {
  let totalSuccessCount = 0;

  // Send via FCM
  if (tokens.length > 0) {
    try {
      const notificationTag = `${type}-${Date.now()}`;

      const message: admin.messaging.MulticastMessage = {
        tokens,
        data: {
          title,
          body,
          icon: NOTIFICATION_CONFIG.ICON_PATH,
          badge: NOTIFICATION_CONFIG.BADGE_PATH,
          url,
          type,
          tag: notificationTag,
        },
        android: {
          priority: 'high',
        },
        webpush: {
          headers: {
            Urgency: NOTIFICATION_CONFIG.URGENCY,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      totalSuccessCount += response.successCount;

      logger.info(`FCM push notification multicast sent`, {
        participantId,
        totalDevices: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];

        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;

            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered"
            ) {
              failedTokens.push(tokens[index]);
              logger.warn(`Removing invalid/expired FCM token`, {
                participantId,
                token: truncateToken(tokens[index]),
                errorCode,
              });
            }
          }
        });

        if (failedTokens.length > 0) {
          await removeExpiredTokens(participantId, failedTokens);
        }
      }
    } catch (error) {
      logger.error("Error sending FCM push notification multicast", error as Error);
    }
  }

  // Send via Web Push (iOS Safari fallback)
  const shouldSendWebPush = tokens.length === 0;

  if (shouldSendWebPush && webPushSubscriptions.length > 0) {
    logger.info('Sending via Web Push (FCM not available)', {
      participantId,
      subscriptionCount: webPushSubscriptions.length,
    });

    const webPushSuccessCount = await sendWebPushNotifications(
      participantId,
      webPushSubscriptions,
      title,
      body,
      url,
      type
    );
    totalSuccessCount += webPushSuccessCount;
  } else if (webPushSubscriptions.length > 0) {
    logger.debug('Skipping Web Push (FCM already sent)', {
      participantId,
      fcmTokenCount: tokens.length,
    });
  }

  return totalSuccessCount;
}

/**
 * Remove expired push tokens
 */
async function removeExpiredTokens(
  participantId: string,
  failedTokens: string[]
): Promise<void> {
  try {
    const db = getSeoulDB();
    const participantRef = db
      .collection("participants")
      .doc(participantId);

    const participantSnap = await participantRef.get();

    if (!participantSnap.exists) {
      return;
    }

    const participantData = participantSnap.data();
    const pushTokens: Array<{ deviceId: string; token: string; updatedAt: admin.firestore.Timestamp }> =
      participantData?.pushTokens || [];

    const tokensToRemove = pushTokens.filter((entry) =>
      failedTokens.includes(entry.token)
    );

    if (tokensToRemove.length === 0) {
      return;
    }

    await participantRef.update({
      pushTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
    });

    logger.info(`Removed expired tokens for participant: ${participantId}`, {
      arrayTokensRemoved: tokensToRemove.length,
    });

    const remainingTokens = pushTokens.filter(
      (entry) => !tokensToRemove.some((failed) => failed.token === entry.token)
    );

    if (remainingTokens.length === 0) {
      await participantRef.update({
        pushNotificationEnabled: false,
      });
      logger.info(`All push tokens invalid, disabled push notifications for: ${participantId}`);
    }
  } catch (error) {
    logger.error(`Error removing expired tokens for ${participantId}`, error as Error);
  }
}
