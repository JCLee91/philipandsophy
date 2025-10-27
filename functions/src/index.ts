/**
 * Firebase Cloud Functions for PhilipandSophy
 *
 * Push Notification Triggers:
 * 1. onMessageCreated - DM 메시지 전송 시
 * 2. onNoticeCreated - 공지사항 작성 시
 * 3. sendMatchingNotifications - 매칭 결과 알림 (HTTP 함수)
 * 4. scheduledMatchingPreview - 매일 오전 5시 자동 매칭 프리뷰 (Scheduled 함수)
 *
 * Auth Triggers:
 * 5. beforeUserCreated - 회원가입 전 도메인 검증 (Data Center용)
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
// import { beforeUserCreated } from "firebase-functions/v2/identity"; // Temporarily disabled
import { setGlobalOptions } from "firebase-functions/v2";
import { defineString } from "firebase-functions/params";
import * as webpush from "web-push";
import { logger } from "./lib/logger";
import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  NOTIFICATION_TYPES,
} from "./constants/notifications";
// Auth constants temporarily unused
// import {
//   ALLOWED_EMAIL_DOMAINS,
//   ALLOWED_PHONE_COUNTRY_CODES,
//   ALLOWED_DOMAINS_TEXT,
// } from "./constants/auth";

// Global options for all functions
setGlobalOptions({
  region: "us-central1", // Closest to Firestore nam5 (US multi-region)
  maxInstances: 10,
});

// Environment parameters
const cohortIdParam = defineString("DEFAULT_COHORT_ID", {
  description: "Default cohort ID for scheduled matching",
  default: "1",
});

const apiBaseUrlParam = defineString("API_BASE_URL", {
  description: "Base URL for API calls",
  default: "https://philipandsophy.vercel.app",
});

const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
  description: "Internal secret for Cron ↔ Next.js API authentication",
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
  return admin
    .firestore()
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
  const db = admin.firestore();

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
    const participantDoc = await admin
      .firestore()
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
    const participantDoc = await admin
      .firestore()
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
    const participantRef = admin
      .firestore()
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
    const participantRef = admin
      .firestore()
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
    database: "(default)", // Explicitly specify database to auto-detect nam5 region
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
 */
export const onNoticeCreated = onDocumentCreated(
  {
    document: "notices/{noticeId}",
    database: "(default)", // Explicitly specify database to auto-detect nam5 region
  },
  async (event) => {
    const noticeData = event.data?.data();

    if (!noticeData) {
      logger.error("No notice data found");
      return;
    }

    const {cohortId, content} = noticeData;

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
 * 3. 매칭 결과 알림 (HTTP 함수)
 *
 * 매칭 확정 API에서 호출하는 함수
 *
 * ✅ Security: Firebase ID Token 인증 + isAdministrator 커스텀 클레임 검증
 *
 * Request headers:
 * - Authorization: Bearer <Firebase ID Token>
 *
 * Request body:
 * {
 *   "cohortId": "cohort-id",
 *   "date": "2025-10-12"
 * }
 */
export const sendMatchingNotifications = onRequest(
  {cors: true},
  async (request, response) => {
    // Only allow POST requests
    if (request.method !== "POST") {
      response.status(405).json({error: "Method not allowed"});
      return;
    }

    // ✅ Authentication: Verify Firebase ID Token
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Unauthorized request: Missing or invalid Authorization header");
      response.status(401).json({
        error: "Unauthorized",
        message: "Authorization header with Bearer token is required",
      });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verify ID Token and decode claims
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // ✅ Authorization: Check isAdministrator custom claim
      if (!decodedToken.isAdministrator) {
        logger.warn("Forbidden request: User is not an administrator", {
          uid: decodedToken.uid,
          email: decodedToken.email,
        });
        response.status(403).json({
          error: "Forbidden",
          message: "Administrator permission required",
        });
        return;
      }

      logger.info("Authenticated administrator request", {
        uid: decodedToken.uid,
        email: decodedToken.email,
      });
    } catch (authError: any) {
      logger.error("Authentication failed", authError);
      response.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
      return;
    }

    const {cohortId, date} = request.body;

    if (!cohortId || !date) {
      response.status(400).json({error: "Missing cohortId or date"});
      return;
    }

    try {
      // Get all participants in cohort (including admins)
      const participantsSnapshot = await getCohortParticipants(cohortId);

      if (participantsSnapshot.empty) {
        response.status(404).json({error: "No participants found"});
        return;
      }

      // ✅ Send push notification to all participants (dual-path support)
      let totalFCM = 0;
      let totalWebPush = 0;
      let totalSuccess = 0;

      const pushPromises = participantsSnapshot.docs.map(async (doc) => {
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
          NOTIFICATION_MESSAGES.MATCHING_TITLE, // Title: "오늘의 프로필북이 도착했습니다"
          "새롭게 도착한 참가자들의 프로필 북을 확인해보세요", // Body: 설명
          NOTIFICATION_ROUTES.TODAY_LIBRARY,
          NOTIFICATION_TYPES.MATCHING
        );

        return successCount;
      });

      const results = await Promise.all(pushPromises);
      totalSuccess = results.reduce((sum, count) => sum + count, 0);

      logger.info(`Matching notifications sent (dual-path)`, {
        cohortId,
        date,
        totalParticipants: participantsSnapshot.size,
        totalFCM,
        totalWebPush,
        totalSuccess,
      });

      response.status(200).json({
        success: true,
        totalParticipants: participantsSnapshot.size,
        totalFCM,
        totalWebPush,
        notificationsSent: totalSuccess,
        date,
      });
    } catch (error) {
      logger.error("Error sending matching notifications", error as Error);
      response.status(500).json({error: "Internal server error"});
    }
  }
);

/**
 * 4. 매일 오전 5시 자동 매칭 프리뷰 (Scheduled 함수)
 *
 * 매일 오전 5시 (KST)에 자동으로 실행
 * 1. Preview API 호출하여 매칭 결과 생성
 * 2. 결과를 Firestore에 임시 저장 (matching_previews 컬렉션)
 * 3. 관리자들에게 푸시 알림 전송
 */
export const scheduledMatchingPreview = onSchedule(
  {
    schedule: "0 5 * * *", // 매일 오전 5시 (KST)
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    logger.info("🤖 Scheduled matching preview started");

    try {
      // 1. 환경 설정
      const cohortId = cohortIdParam.value();
      const apiBaseUrl = apiBaseUrlParam.value();
      const internalSecret = internalSecretParam.value();

      // 2. INTERNAL_SERVICE_SECRET 검증 (필수)
      if (!internalSecret) {
        logger.error("INTERNAL_SERVICE_SECRET is not set; aborting scheduled preview");
        return;
      }

      // 3. Preview API 호출
      logger.info(`Calling preview API for cohort: ${cohortId}`);

      const response = await fetch(`${apiBaseUrl}/api/admin/matching/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": internalSecret,
        },
        body: JSON.stringify({ cohortId }),
      });

      if (!response.ok) {
        throw new Error(`Preview API failed: ${response.status}`);
      }

      const previewResult = await response.json();

      if (!previewResult.success) {
        throw new Error(`Preview API returned error: ${previewResult.error}`);
      }

      logger.info(`Preview generated successfully: ${previewResult.totalParticipants} participants`);

      // 3. Firestore에 임시 저장 (관리자가 검토할 수 있도록)
      const previewData = {
        cohortId,
        date: previewResult.date,
        matching: previewResult.matching,
        question: previewResult.question,
        totalParticipants: previewResult.totalParticipants,
        featuredParticipants: previewResult.featuredParticipants,
        submissionStats: previewResult.submissionStats,
        createdAt: admin.firestore.Timestamp.now(),
        status: "pending", // pending | confirmed | expired
      };

      // 기존 pending preview가 있으면 expired로 변경
      const existingPreviewsSnapshot = await admin
        .firestore()
        .collection("matching_previews")
        .where("cohortId", "==", cohortId)
        .where("status", "==", "pending")
        .get();

      const batch = admin.firestore().batch();

      existingPreviewsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {status: "expired"});
      });

      // 새 preview 저장
      const previewRef = admin
        .firestore()
        .collection("matching_previews")
        .doc(`${cohortId}-${previewResult.date}`);

      batch.set(previewRef, previewData);

      await batch.commit();

      logger.info(`Preview saved to Firestore: ${previewRef.id}`);

      // AI 매칭 완료 알림은 보내지 않음 (관리자가 직접 확인)
      logger.info(`✅ Scheduled matching preview completed (no notifications sent)`);
    } catch (error) {
      logger.error("❌ Scheduled matching preview failed", error as Error);
      throw error; // Retry on failure
    }
  }
);

/**
 * 5. 회원가입 전 도메인 검증 (Data Center용)
 *
 * beforeUserCreated Auth Trigger
 * - 허용된 이메일 도메인만 회원가입 가능
 * - 허용된 전화번호 국가 코드만 가능
 *
 * ⚠️ Temporarily disabled due to region mismatch
 */
/*
export const beforeUserCreatedHandler = beforeUserCreated(async (event) => {
  const user = event.data;

  // 데이터 검증
  if (!user) {
    logger.error("beforeUserCreated: No user data");
    throw new HttpsError("invalid-argument", "사용자 데이터가 없습니다.");
  }

  logger.info("beforeUserCreated triggered", {
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
  });

  // 이메일 또는 전화번호 필수 (익명 로그인 차단)
  if (!user.email && !user.phoneNumber) {
    logger.error("No email or phone number provided", {
      uid: user.uid,
      providerData: user.providerData,
    });
    throw new HttpsError(
      "invalid-argument",
      "이메일 또는 전화번호가 필요합니다."
    );
  }

  // 이메일 가입인 경우 - 도메인 검증
  if (user.email) {
    const emailDomain = user.email.split("@")[1]?.toLowerCase();

    if (!emailDomain) {
      logger.error("Invalid email format", { email: user.email });
      throw new HttpsError(
        "invalid-argument",
        "이메일 형식이 올바르지 않습니다."
      );
    }

    // Type-safe domain check
    const isAllowedDomain = (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(emailDomain);

    if (!isAllowedDomain) {
      logger.warn("Blocked signup attempt - invalid domain", {
        email: user.email,
        domain: emailDomain,
        allowedDomains: ALLOWED_DOMAINS_TEXT,
      });

      throw new HttpsError(
        "permission-denied",
        `${emailDomain} 도메인은 가입이 허용되지 않습니다. 허용 도메인: ${ALLOWED_DOMAINS_TEXT}`
      );
    }

    logger.info("Email domain validated", { email: user.email, domain: emailDomain });
  }

  // 전화번호 가입인 경우 - 국가 코드 검증
  if (user.phoneNumber) {
    const isAllowedCountry = ALLOWED_PHONE_COUNTRY_CODES.some(
      (code) => user.phoneNumber?.startsWith(code)
    );

    if (!isAllowedCountry) {
      logger.warn("Blocked signup attempt - invalid country code", {
        phoneNumber: user.phoneNumber,
        allowedCodes: ALLOWED_PHONE_COUNTRY_CODES.join(", "),
      });

      throw new HttpsError(
        "permission-denied",
        `허용되지 않은 국가의 전화번호입니다. 허용 국가 코드: ${ALLOWED_PHONE_COUNTRY_CODES.join(", ")}`
      );
    }

    logger.info("Phone country code validated", { phoneNumber: user.phoneNumber });
  }

  // 검증 통과
  logger.info("✅ User creation allowed", {
    uid: user.uid,
    hasEmail: !!user.email,
    hasPhone: !!user.phoneNumber,
  });

  return;
});
*/
