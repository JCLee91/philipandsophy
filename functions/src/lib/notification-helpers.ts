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
  lastUsedAt?: admin.firestore.Timestamp;
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
 * Get participant info for notifications
 */
export async function getParticipantInfo(participantId: string): Promise<{
  name: string;
  profileImageCircle?: string;
  isAdmin: boolean;
}> {
  try {
    const db = getSeoulDB();
    const participantDoc = await db
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantDoc.exists) {
      return { name: "참가자", isAdmin: false };
    }

    const data = participantDoc.data();
    return {
      name: data?.name || "참가자",
      profileImageCircle: data?.profileImageCircle,
      isAdmin: data?.isAdministrator || data?.isSuperAdmin || false,
    };
  } catch (error) {
    logger.error(`Error getting participant info for ${participantId}`, error as Error);
    return { name: "참가자", isAdmin: false };
  }
}

/**
 * Get participant name
 * @deprecated Use getParticipantInfo instead
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
 * Update lastUsedAt for successful push notifications
 * Web Push와 FCM 공통 사용
 */
async function updateLastUsedAt(
  participantId: string,
  type: 'fcm' | 'webpush',
  deviceIds: string[]
): Promise<void> {
  if (deviceIds.length === 0) {
    return;
  }

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
    const now = admin.firestore.Timestamp.now();
    const deviceIdSet = new Set(deviceIds);

    if (type === 'webpush') {
      const subscriptions: WebPushSubscriptionData[] =
        participantData?.webPushSubscriptions || [];

      const updatedSubscriptions = subscriptions.map((sub) => {
        if (deviceIdSet.has(sub.deviceId)) {
          return { ...sub, lastUsedAt: now };
        }
        return sub;
      });

      await participantRef.update({
        webPushSubscriptions: updatedSubscriptions,
      });
    } else {
      // FCM tokens
      const tokens: PushTokenEntry[] = participantData?.pushTokens || [];

      const updatedTokens = tokens.map((entry) => {
        if (deviceIdSet.has(entry.deviceId)) {
          return { ...entry, lastUsedAt: now };
        }
        return entry;
      });

      await participantRef.update({
        pushTokens: updatedTokens,
      });
    }

    logger.debug(`Updated lastUsedAt for ${type} devices`, {
      participantId,
      deviceCount: deviceIds.length,
    });
  } catch (error) {
    // lastUsedAt 갱신 실패는 치명적이지 않으므로 경고만 로깅
    logger.warn(`Failed to update lastUsedAt for ${type}`, {
      participantId,
      error: (error as Error).message,
    });
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
  type: string,
  icon?: string
): Promise<number> {
  if (subscriptions.length === 0) {
    return 0;
  }

  const iconPath = icon || NOTIFICATION_CONFIG.ICON_PATH;

  if (!IS_WEBPUSH_CONFIGURED) {
    logger.warn("Web Push configuration missing, skipping Web Push delivery");
    return 0;
  }

  let successCount = 0;
  const failedSubscriptions: WebPushSubscriptionData[] = [];
  const successfulSubscriptions: WebPushSubscriptionData[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        // ✅ iOS PWA Filter: Only allow iPhone/iPad/iPod
        const userAgent = subscription.userAgent || "";
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

        if (!isIOS) {
          logger.debug("Skipping Web Push for non-iOS device", {
            participantId,
            userAgent,
            deviceId: subscription.deviceId,
          });
          return;
        }

        const payload = JSON.stringify({
          title,
          body,
          icon: iconPath,
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
        successfulSubscriptions.push(subscription);
        logger.info(`Web Push sent successfully (iOS PWA)`, {
          participantId,
          deviceId: subscription.deviceId,
        });
      } catch (error: any) {
        const statusCode = error?.statusCode;

        // 4xx 에러는 모두 구독 문제 (삭제 대상)
        // 400: Bad Request (손상된 구독 데이터)
        // 404: Not Found (구독 없음)
        // 410: Gone (구독 만료)
        if (statusCode >= 400 && statusCode < 500) {
          failedSubscriptions.push(subscription);
          logger.warn(`Web Push subscription invalid (4xx error)`, {
            participantId,
            deviceId: subscription.deviceId,
            statusCode,
          });
        } else {
          // 5xx 서버 에러는 삭제하지 않음 (일시적 문제일 수 있음)
          logger.error(`Web Push send failed (server error)`, {
            participantId,
            deviceId: subscription.deviceId,
            error: error.message,
            statusCode,
          });
        }
      }
    })
  );

  // 실패한 구독 삭제
  if (failedSubscriptions.length > 0) {
    await removeExpiredWebPushSubscriptions(participantId, failedSubscriptions);
  }

  // 성공한 구독의 lastUsedAt 갱신
  if (successfulSubscriptions.length > 0) {
    const successfulDeviceIds = successfulSubscriptions.map(s => s.deviceId);
    await updateLastUsedAt(participantId, 'webpush', successfulDeviceIds);
  }

  return successCount;
}

/**
 * Remove expired Web Push subscriptions
 * deviceId 기반 필터링으로 객체 비교 문제 회피
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

    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      return;
    }

    const participantData = participantSnap.data();
    const currentSubscriptions: WebPushSubscriptionData[] =
      participantData?.webPushSubscriptions || [];

    // deviceId로 필터링 (Timestamp 객체 비교 문제 회피)
    const failedDeviceIds = new Set(failedSubscriptions.map(s => s.deviceId));
    const remainingSubscriptions = currentSubscriptions.filter(
      (s: WebPushSubscriptionData) => !failedDeviceIds.has(s.deviceId)
    );

    await participantRef.update({
      webPushSubscriptions: remainingSubscriptions,
    });

    logger.info(`Removed ${failedSubscriptions.length} expired Web Push subscriptions`, {
      participantId,
      removedDeviceIds: Array.from(failedDeviceIds),
    });

    const remainingFCM = participantData?.pushTokens || [];

    if (remainingSubscriptions.length === 0 && remainingFCM.length === 0) {
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
  type: string,
  icon?: string
): Promise<number> {
  let totalSuccessCount = 0;
  const iconPath = icon || NOTIFICATION_CONFIG.ICON_PATH;

  // Send via FCM
  if (tokens.length > 0) {
    try {
      const notificationTag = `${type}-${Date.now()}`;

      const message: admin.messaging.MulticastMessage = {
        tokens,
        data: {
          title,
          body,
          icon: iconPath,
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

      // 성공한 토큰의 lastUsedAt 갱신
      if (response.successCount > 0) {
        const successfulDeviceIds: string[] = [];
        response.responses.forEach((resp, index) => {
          if (resp.success) {
            const entry = entriesMap.get(tokens[index]);
            if (entry?.deviceId) {
              successfulDeviceIds.push(entry.deviceId);
            }
          }
        });
        if (successfulDeviceIds.length > 0) {
          await updateLastUsedAt(participantId, 'fcm', successfulDeviceIds);
        }
      }

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
      type,
      iconPath
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
 * token 문자열 기반 필터링으로 객체 비교 문제 회피
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

    // token 문자열로 필터링 (Timestamp 객체 비교 문제 회피)
    const failedTokenSet = new Set(failedTokens);
    const remainingTokens = pushTokens.filter(
      (entry) => !failedTokenSet.has(entry.token)
    );

    const removedCount = pushTokens.length - remainingTokens.length;
    if (removedCount === 0) {
      return;
    }

    await participantRef.update({
      pushTokens: remainingTokens,
    });

    logger.info(`Removed expired tokens for participant: ${participantId}`, {
      tokensRemoved: removedCount,
    });

    const remainingWebPush = participantData?.webPushSubscriptions || [];

    if (remainingTokens.length === 0 && remainingWebPush.length === 0) {
      await participantRef.update({
        pushNotificationEnabled: false,
      });
      logger.info(`All push tokens invalid, disabled push notifications for: ${participantId}`);
    }
  } catch (error) {
    logger.error(`Error removing expired tokens for ${participantId}`, error as Error);
  }
}
