/**
 * Firebase Cloud Functions for PhilipandSophy
 *
 * Push Notification Triggers:
 * 1. onMessageCreated - DM 메시지 전송 시
 * 2. onNoticeCreated - 공지사항 작성 시
 * 3. scheduledMatchingPreview - 매일 새벽 2시 자동 매칭 (Scheduled 함수)
 * 4. sendCustomNotification - 커스텀 푸시 알림 (HTTP 함수)
 */

import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineString } from "firebase-functions/params";
import * as webpush from "web-push";
import { logger } from "./lib/logger";
import { getSeoulDB } from "./lib/db-helper";
import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  NOTIFICATION_TYPES,
} from "./constants/notifications";
// v2.0 random matching deprecated - see lib/random-matching.deprecated.ts
// v3.0 cluster matching now used - see lib/cluster-matching.ts

// Global options for all functions
setGlobalOptions({
  region: "asia-northeast3", // Seoul, South Korea - Optimized for Korean users
  maxInstances: 10,
});

// Environment parameters
const cohortIdParam = defineString("DEFAULT_COHORT_ID", {
  description: "Default cohort ID for scheduled matching",
  default: "2",
});

const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
  description: "Internal secret for scheduled function authentication",
  default: "",
});

// Initialize Firebase Admin
admin.initializeApp();

// ✅ Configure Web Push VAPID details
// These must match the keys in .env.local (NEXT_PUBLIC_WEBPUSH_VAPID_KEY and WEBPUSH_VAPID_PRIVATE_KEY)
// Read from environment variables (.env file in functions directory)
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
 * Helper: Truncate long text for notifications
 */
function truncateContent(content: string, maxLength = 100): string {
  return content.length > maxLength
    ? `${content.substring(0, maxLength)}...`
    : content;
}

/**
 * Helper: Safely truncate token for logging (security best practice)
 */
function truncateToken(token: string): string {
  return `${token.substring(0, 20)}...`;
}

/**
 * Helper: Get all participants in cohort (including admins)
 */
async function getCohortParticipants(
  cohortId: string
): Promise<admin.firestore.QuerySnapshot<admin.firestore.DocumentData>> {
  return getSeoulDB()
    .collection("participants")
    .where("cohortId", "==", cohortId)
    .get();
}

/**
 * Helper: Get all administrators (super admins + general admins)
 *
 * Returns participants where:
 * - isSuperAdmin === true OR
 * - isAdministrator === true
 */
async function getAllAdministrators(): Promise<admin.firestore.QuerySnapshot<admin.firestore.DocumentData>> {
  const db = getSeoulDB();

  // Query 1: Get super admins
  const superAdminsQuery = db
    .collection("participants")
    .where("isSuperAdmin", "==", true);

  // Query 2: Get general admins
  const generalAdminsQuery = db
    .collection("participants")
    .where("isAdministrator", "==", true);

  const [superAdminsSnapshot, generalAdminsSnapshot] = await Promise.all([
    superAdminsQuery.get(),
    generalAdminsQuery.get(),
  ]);

  // Combine results and deduplicate by ID
  const adminMap = new Map<string, admin.firestore.QueryDocumentSnapshot>();

  superAdminsSnapshot.docs.forEach((doc) => {
    adminMap.set(doc.id, doc);
  });

  generalAdminsSnapshot.docs.forEach((doc) => {
    adminMap.set(doc.id, doc);
  });

  // Return a mock QuerySnapshot with combined docs
  // Note: This is a simplified version that returns the docs array
  // The actual QuerySnapshot interface is complex, but we only need .docs and .size
  return {
    docs: Array.from(adminMap.values()),
    size: adminMap.size,
    empty: adminMap.size === 0,
  } as admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;
}

/**
 * Push token entry type (FCM)
 */
interface PushTokenEntry {
  deviceId: string;
  token: string;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Web Push subscription data type (Standard Web Push API)
 */
interface WebPushSubscriptionData {
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
 * Helper: Get push tokens and subscriptions for a participant (Dual-path support)
 *
 * ✅ Updated to support both FCM tokens and Web Push subscriptions
 *
 * @returns Object with FCM tokens, entries map, and Web Push subscriptions
 */
async function getPushTokens(participantId: string): Promise<{
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

    // ✅ Check pushNotificationEnabled flag first
    if (participantData?.pushNotificationEnabled === false) {
      logger.debug(`Push notifications disabled for participant: ${participantId}`);
      return { tokens: [], entriesMap: new Map(), webPushSubscriptions: [] };
    }

    // ✅ Priority 1: Get FCM tokens from pushTokens array
    const pushTokens: PushTokenEntry[] = participantData?.pushTokens || [];
    const tokens: string[] = [];
    const entriesMap = new Map<string, PushTokenEntry | null>();

    pushTokens.forEach((entry) => {
      tokens.push(entry.token);
      entriesMap.set(entry.token, entry); // Store actual Firestore entry
    });

    // ✅ Priority 3: Get Web Push subscriptions
    const webPushSubscriptions: WebPushSubscriptionData[] =
      participantData?.webPushSubscriptions || [];

    return { tokens, entriesMap, webPushSubscriptions };
  } catch (error) {
    logger.error(`Error getting push tokens for ${participantId}`, error as Error);
    return { tokens: [], entriesMap: new Map(), webPushSubscriptions: [] };
  }
}

/**
 * Helper: Get participant name
 */
async function getParticipantName(participantId: string): Promise<string> {
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
 * Helper: Send Web Push notifications
 *
 * @param participantId - Participant ID (for subscription cleanup)
 * @param subscriptions - Array of Web Push subscriptions
 * @param title - Notification title
 * @param body - Notification body
 * @param url - Click action URL
 * @param type - Notification type
 * @returns Number of successfully sent notifications
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
          endpoint: subscription.endpoint.substring(0, 50) + "...",
        });
      } catch (error: any) {
        const statusCode = error?.statusCode;

        // 410 Gone = subscription expired or invalid
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

  // Remove expired subscriptions
  if (failedSubscriptions.length > 0) {
    await removeExpiredWebPushSubscriptions(participantId, failedSubscriptions);
  }

  return successCount;
}

/**
 * Helper: Remove expired Web Push subscriptions from Firestore
 *
 * @param participantId - Participant ID
 * @param failedSubscriptions - Array of expired subscriptions
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

    // Remove expired subscriptions using arrayRemove
    await participantRef.update({
      webPushSubscriptions: admin.firestore.FieldValue.arrayRemove(...failedSubscriptions),
    });

    logger.info(`Removed ${failedSubscriptions.length} expired Web Push subscriptions`, {
      participantId,
      deviceIds: failedSubscriptions.map((sub) => sub.deviceId),
    });

    // Check if any subscriptions/tokens remain
    const participantSnap = await participantRef.get();
    const participantData = participantSnap.data();
    const remainingWebPush = participantData?.webPushSubscriptions || [];
    const remainingFCM = participantData?.pushTokens || [];

    // If no push methods remain, disable push notifications
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
 * Helper: Send push notifications (Dual-path: FCM + Web Push)
 *
 * ✅ Updated to send via both FCM and Web Push
 * ✅ Automatically removes invalid/expired tokens and subscriptions
 * ✅ Uses entriesMap for proper arrayRemove matching (fixes Timestamp.now() bug)
 *
 * @param participantId - Participant ID (for token cleanup)
 * @param tokens - Array of FCM tokens
 * @param entriesMap - Map of token strings to their Firestore entries (for proper arrayRemove)
 * @param webPushSubscriptions - Array of Web Push subscriptions
 * @param title - Notification title
 * @param body - Notification body
 * @param url - Click action URL
 * @param type - Notification type
 * @returns Number of successfully sent notifications
 */
async function sendPushNotificationMulticast(
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

  // ✅ Send via FCM (Android/Desktop)
  if (tokens.length > 0) {
    try {
      // ✅ Generate unique tag for Android notification stacking
      const notificationTag = `${type}-${Date.now()}`;

      // ✅ Data-only message (Service Worker에서 수동 표시)
      // notification 필드 제거로 FCM 자동 표시 방지 → 중복 알림 해결
      const message: admin.messaging.MulticastMessage = {
        tokens,
        data: {
          // ✅ title, body를 data에 포함 (SW에서 읽음)
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

      // ✅ Handle failed tokens (remove invalid/expired tokens)
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

        // Remove failed tokens from Firestore
        if (failedTokens.length > 0) {
          await removeExpiredTokens(participantId, failedTokens);
        }
      }
    } catch (error) {
      logger.error("Error sending FCM push notification multicast", error as Error);
    }
  }

  // ✅ Send via Web Push (iOS Safari ONLY - FCM fallback)
  // FCM 토큰이 있으면 Web Push는 건너뜀 (중복 방지)
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
 * Helper: Remove expired push tokens from Firestore
 *
 * ✅ Updated to remove tokens from pushTokens array
 * ✅ Handles legacy pushToken field deletion (for backward compatibility)
 * ✅ Sets pushNotificationEnabled to false if all tokens removed
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

    // Find token entries to remove from pushTokens array
    const tokensToRemove = pushTokens.filter((entry) =>
      failedTokens.includes(entry.token)
    );

    // If nothing to remove, return early
    if (tokensToRemove.length === 0) {
      return;
    }

    // Remove failed tokens from pushTokens array
    await participantRef.update({
      pushTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
    });

    logger.info(`Removed expired tokens for participant: ${participantId}`, {
      arrayTokensRemoved: tokensToRemove.length,
    });

    // ✅ If all tokens removed, disable push notifications
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

/**
 * 1. DM 메시지 전송 시 푸시 알림
 *
 * Trigger: messages/{messageId} 문서 생성
 *
 * ✅ Updated to use pushTokens array for multi-device support
 */
export const onMessageCreated = onDocumentCreated(
  {
    document: "messages/{messageId}",
    database: "seoul", // ✅ Seoul DB 사용
  },
  async (event) => {
    const messageData = event.data?.data();

    if (!messageData) {
      logger.error("No message data found");
      return;
    }

    const {senderId, receiverId, content} = messageData;

    // Validate required fields
    if (!senderId || !receiverId || !content) {
      logger.error("Missing required fields in message data", {senderId, receiverId, hasContent: !!content});
      return;
    }

    // Get sender name
    const senderName = await getParticipantName(senderId);

    // ✅ Get receiver's push tokens and subscriptions (dual-path support)
    const { tokens, entriesMap, webPushSubscriptions } = await getPushTokens(receiverId);

    if (tokens.length === 0 && webPushSubscriptions.length === 0) {
      logger.info(`No push tokens/subscriptions for receiver: ${receiverId}`);
      return;
    }

    // Truncate long messages
    const messagePreview = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // ✅ Send push notification via FCM + Web Push
    const successCount = await sendPushNotificationMulticast(
      receiverId,
      tokens,
      entriesMap,
      webPushSubscriptions,
      senderName,
      messagePreview,
      NOTIFICATION_ROUTES.CHAT,
      NOTIFICATION_TYPES.DM
    );

    logger.info(`DM push notification processed (dual-path)`, {
      messageId: event.params.messageId,
      receiverId,
      totalFCM: tokens.length,
      totalWebPush: webPushSubscriptions.length,
      successCount,
    });
  }
);

/**
 * 2. 공지사항 작성 시 푸시 알림
 *
 * Trigger: notices/{noticeId} 문서 생성
 *
 * ✅ Updated to use pushTokens array for multi-device support
 * ✅ Skip push notifications for draft notices (status: 'draft')
 */
export const onNoticeCreated = onDocumentCreated(
  {
    document: "notices/{noticeId}",
    database: "seoul", // ✅ Seoul DB 사용
  },
  async (event) => {
    const noticeData = event.data?.data();

    if (!noticeData) {
      logger.error("No notice data found");
      return;
    }

    const {cohortId, content, status} = noticeData;

    // ✅ Skip push notifications for draft notices
    if (status === 'draft') {
      logger.info('Draft notice created, skipping push notifications', {
        noticeId: event.params.noticeId,
        cohortId,
      });
      return;
    }

    // Validate required fields
    if (!cohortId || !content) {
      logger.error("Missing required fields in notice data", {cohortId, hasContent: !!content});
      return;
    }

    // Get all participants in cohort (including admins)
    const participantsSnapshot = await getCohortParticipants(cohortId);

    if (participantsSnapshot.empty) {
      logger.info(`No participants found in cohort: ${cohortId}`);
      return;
    }

    // ✅ Get all administrators (they should receive ALL notices regardless of cohortId)
    const adminsSnapshot = await getAllAdministrators();

    // Combine cohort participants + all admins (deduplicate by ID)
    const recipientMap = new Map<string, admin.firestore.QueryDocumentSnapshot>();

    // Add cohort participants
    participantsSnapshot.docs.forEach((doc) => {
      recipientMap.set(doc.id, doc);
    });

    // Add all admins (overwrites if already in cohort)
    adminsSnapshot.docs.forEach((doc) => {
      recipientMap.set(doc.id, doc);
    });

    const allRecipients = Array.from(recipientMap.values());

    logger.info(`Notice recipients`, {
      cohortParticipants: participantsSnapshot.size,
      administrators: adminsSnapshot.size,
      totalRecipients: allRecipients.length,
    });

    // Truncate long notice for body
    const noticeBody = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // ✅ Send push notification to all recipients (cohort + admins, dual-path support)
    let totalFCM = 0;
    let totalWebPush = 0;
    let totalSuccess = 0;

    const pushPromises = allRecipients.map(async (doc) => {
      const participantId = doc.id;

      // Get all tokens and subscriptions for this participant
      const { tokens, entriesMap, webPushSubscriptions } = await getPushTokens(participantId);

      if (tokens.length === 0 && webPushSubscriptions.length === 0) {
        return 0;
      }

      totalFCM += tokens.length;
      totalWebPush += webPushSubscriptions.length;

      const successCount = await sendPushNotificationMulticast(
        participantId,
        tokens,
        entriesMap,
        webPushSubscriptions,
        NOTIFICATION_MESSAGES.NOTICE_TITLE, // Title: "새로운 공지가 등록되었습니다"
        noticeBody, // Body: 공지 내용
        NOTIFICATION_ROUTES.CHAT,
        NOTIFICATION_TYPES.NOTICE
      );

      return successCount;
    });

    const results = await Promise.all(pushPromises);
    totalSuccess = results.reduce((sum, count) => sum + (count || 0), 0);

    logger.info(`Notice push notifications sent (dual-path)`, {
      noticeId: event.params.noticeId,
      totalParticipants: participantsSnapshot.size,
      totalFCM,
      totalWebPush,
      totalSuccess,
    });
  }
);

/**
 * 2-1. 공지사항 업데이트 시 푸시 알림 (임시저장 → 발행)
 *
 * Trigger: notices/{noticeId} 문서 업데이트
 *
 * ✅ Draft → Published 변경 시에만 푸시 알림 전송
 */
export const onNoticeUpdated = onDocumentUpdated(
  {
    document: "notices/{noticeId}",
    database: "seoul", // ✅ Seoul DB 사용
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.error("No notice data found in update");
      return;
    }

    const oldStatus = beforeData.status || 'published';
    const newStatus = afterData.status || 'published';

    // ✅ Only send notifications when draft → published
    if (oldStatus !== 'draft' || newStatus !== 'published') {
      logger.debug('Notice updated but status change not draft→published, skipping push', {
        noticeId: event.params.noticeId,
        oldStatus,
        newStatus,
      });
      return;
    }

    logger.info('Draft notice published, sending push notifications', {
      noticeId: event.params.noticeId,
      cohortId: afterData.cohortId,
    });

    const {cohortId, content} = afterData;

    // Validate required fields
    if (!cohortId || !content) {
      logger.error("Missing required fields in notice data", {cohortId, hasContent: !!content});
      return;
    }

    // Get all participants in cohort (including admins)
    const participantsSnapshot = await getCohortParticipants(cohortId);

    if (participantsSnapshot.empty) {
      logger.info(`No participants found in cohort: ${cohortId}`);
      return;
    }

    // ✅ Get all administrators
    const adminsSnapshot = await getAllAdministrators();

    // Combine cohort participants + all admins (deduplicate by ID)
    const recipientMap = new Map<string, admin.firestore.QueryDocumentSnapshot>();

    participantsSnapshot.docs.forEach((doc) => {
      recipientMap.set(doc.id, doc);
    });

    adminsSnapshot.docs.forEach((doc) => {
      recipientMap.set(doc.id, doc);
    });

    const allRecipients = Array.from(recipientMap.values());

    logger.info(`Notice update recipients`, {
      cohortParticipants: participantsSnapshot.size,
      administrators: adminsSnapshot.size,
      totalRecipients: allRecipients.length,
    });

    // Truncate long notice for body
    const noticeBody = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // ✅ Send push notification to all recipients
    let totalFCM = 0;
    let totalWebPush = 0;
    let totalSuccess = 0;

    const pushPromises = allRecipients.map(async (doc) => {
      const participantId = doc.id;

      const { tokens, entriesMap, webPushSubscriptions } = await getPushTokens(participantId);

      if (tokens.length === 0 && webPushSubscriptions.length === 0) {
        return 0;
      }

      totalFCM += tokens.length;
      totalWebPush += webPushSubscriptions.length;

      const successCount = await sendPushNotificationMulticast(
        participantId,
        tokens,
        entriesMap,
        webPushSubscriptions,
        NOTIFICATION_MESSAGES.NOTICE_TITLE,
        noticeBody,
        NOTIFICATION_ROUTES.CHAT,
        NOTIFICATION_TYPES.NOTICE
      );

      return successCount;
    });

    const results = await Promise.all(pushPromises);
    totalSuccess = results.reduce((sum, count) => sum + (count || 0), 0);

    logger.info(`Notice update push notifications sent (dual-path)`, {
      noticeId: event.params.noticeId,
      totalParticipants: participantsSnapshot.size,
      totalFCM,
      totalWebPush,
      totalSuccess,
    });
  }
);


// ✅ 새로운 랜덤 매칭 시스템 (v2.0)
// v3.0: Cluster Matching (매일 새벽 2시 자동 실행)
export { scheduledClusterMatching } from "./scheduled-cluster-matching";

// Export custom notifications
export { sendCustomNotification } from "./custom-notifications";

/**
 * HTTP Function: Manual Matching Preview
 * POST /manualMatchingPreview
 * Body: { cohortId: string }
 *
 * Firebase Functions에서 직접 랜덤 매칭 실행 (Vercel 10초 타임아웃 회피)
 *
 * @version 2.0.0 - 2025-11-10: AI 매칭 → 랜덤 매칭 전환
 */
export const manualMatchingPreview = onRequest(
  {
    timeoutSeconds: 900, // 15분 타임아웃
    memory: "1GiB",
    cors: true,
  },
  async (req, res) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // POST만 허용
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    let requestCohortId: string | undefined;

    try {
      const { cohortId } = req.body;
      requestCohortId = cohortId;

      if (!cohortId) {
        res.status(400).json({ error: "cohortId is required" });
        return;
      }

      // 인증 확인 (INTERNAL_SERVICE_SECRET 또는 Firebase Auth + Admin 권한 체크)
      const internalSecret = req.headers["x-internal-secret"];
      const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

      if (!internalSecret || internalSecret !== expectedSecret) {
        // Firebase Auth 토큰 확인
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({ error: "Unauthorized: Missing authentication token" });
          return;
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
          logger.error("Token verification failed", { error });
          res.status(401).json({ error: "Unauthorized: Invalid token" });
          return;
        }

        // 🔒 SECURITY: 관리자 권한 확인 (Firestore에서 실제 권한 체크)
        const userUid = decodedToken.uid;
        const db = getSeoulDB();

        try {
          const participantsSnapshot = await db
            .collection("participants")
            .where("firebaseUid", "==", userUid)
            .limit(1)
            .get();

          if (participantsSnapshot.empty) {
            res.status(403).json({ error: "Forbidden: User not found in participants" });
            return;
          }

          const participantData = participantsSnapshot.docs[0].data();
          const isAdmin = participantData.isAdministrator === true || participantData.isSuperAdmin === true;

          if (!isAdmin) {
            logger.warn("Non-admin user attempted to access matching endpoint", {
              uid: userUid,
              participantId: participantsSnapshot.docs[0].id
            });
            res.status(403).json({ error: "Forbidden: Admin privileges required" });
            return;
          }

          logger.info("Admin access granted", {
            uid: userUid,
            participantId: participantsSnapshot.docs[0].id
          });
        } catch (error) {
          logger.error("Admin check failed", { error });
          res.status(500).json({ error: "Internal server error during authorization" });
          return;
        }
      }

      // ✅ 랜덤 매칭으로 전환 (2025-11-10)
      const { getDailyQuestionText } = await import("./constants/daily-questions");
      const { getMatchingTargetDate, getSubmissionDate } = await import("./lib/date-utils");
      const { MATCHING_CONFIG } = await import("./constants/matching");
      const {
        loadProviders,
        loadRecentMatchings,
      } = await import("./lib/matching-inputs");

      // ✅ FIX: 새벽 2시 마감 정책 적용
      // 날짜 정의
      const submissionDate = getMatchingTargetDate(); // 매칭 대상 날짜 (새벽 2시 마감 고려)
      const matchingDate = getSubmissionDate(); // Firebase dailyFeaturedParticipants 키 (새벽 2시 기준)
      const submissionQuestion = getDailyQuestionText(submissionDate);

      logger.info("Starting random matching", { cohortId, submissionDate, matchingDate });

      const db = getSeoulDB();

      // 1. Providers와 Viewers 로드
      const { providers, viewers, notSubmittedParticipants } = await loadProviders(
        db,
        cohortId,
        submissionDate
      );

      // 2. 최소 인원 검증 (차별화된 에러 메시지)
      if (providers.length === 0) {
        res.status(400).json({
          error: "제출자가 없습니다.",
          message: `${submissionDate}에 제출한 참가자가 없습니다. 인증 제출 후 다시 시도해주세요.`,
          participantCount: 0,
        });
        return;
      }

      if (providers.length < MATCHING_CONFIG.MIN_PARTICIPANTS) {
        res.status(400).json({
          error: "최소 인원 미만입니다.",
          message: `${providers.length}명이 제출했습니다. 매칭에는 최소 ${MATCHING_CONFIG.MIN_PARTICIPANTS}명이 필요합니다.`,
          participantCount: providers.length,
        });
        return;
      }

      // 3. 최근 3일 매칭 이력 로드 (중복 방지용)
      const recentMatchings = await loadRecentMatchings(db, cohortId, matchingDate);

      // 랜덤 매칭 실행
      logger.info("Executing random matching", {
        providersCount: providers.length,
        viewersCount: viewers.length,
      });

      const matching = await matchParticipantsRandomly({
        providers,
        viewers,
        recentMatchings,
      });

      logger.info("Random matching completed", {
        cohortId,
        assignedCount: Object.keys(matching.assignments).length,
        validationValid: matching.validation?.valid,
        warnings: matching.validation?.warnings?.length || 0,
      });

      res.status(200).json({
        success: true,
        preview: true,
        date: matchingDate,
        submissionDate,
        question: submissionQuestion, // 참고용 (랜덤 매칭은 질문 사용 안 함)
        totalParticipants: viewers.length, // 전체 참가자 수
        matching: {
          assignments: matching.assignments,
          matchingVersion: "random", // v2.0 랜덤 매칭
        },
        validation: matching.validation,
        submissionStats: {
          submitted: providers.length, // 제출한 참가자 수
          notSubmitted: notSubmittedParticipants.length,
          notSubmittedList: notSubmittedParticipants,
        },
        debug: {
          matchingType: "random",
          providersCount: providers.length,
          viewersCount: viewers.length,
          recentMatchingsCount: Object.keys(recentMatchings).length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error("Random matching preview failed", {
        cohortId: requestCohortId,
        error: message,
      });

      res.status(500).json({
        error: "매칭 실행 중 오류가 발생했습니다.",
        message,
      });
    }
  }
);

/**
 * Export Matching Functions
 *
 * v3.0: Cluster Matching (2025-11-15부터 사용)
 * - scheduledClusterMatching: 매일 새벽 2시 자동 실행 (scheduled-cluster-matching.ts)
 * - manualMatchingPreview: 위에서 직접 정의됨 (2025-11-10 리팩토링)
 *
 * Deprecated:
 * - v2.0: scheduledRandomMatching (scheduled-random-matching.deprecated.ts)
 * - manual-random-matching.ts (쿼리 문제로 deprecated)
 */
