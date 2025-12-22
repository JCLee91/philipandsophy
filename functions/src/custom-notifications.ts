/**
 * Custom Push Notifications
 * Data Center에서 관리자가 직접 보내는 커스텀 알림
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "./lib/logger";
import {
  getPushTokens,
  getCohortParticipants,
  PushTokenEntry,
  WebPushSubscriptionData,
} from "./lib/helpers";
import { getDefaultDb } from "./lib/db-helper";
import * as webpush from "web-push";
import { NOTIFICATION_CONFIG } from "./constants/notifications";

/**
 * Get all administrators (super admins + general admins)
 */
async function getAllAdministrators(): Promise<admin.firestore.QuerySnapshot<admin.firestore.DocumentData>> {
  const db = getDefaultDb();

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

  // Convert Map to array and create a QuerySnapshot-like object
  const combinedDocs = Array.from(adminMap.values());

  return {
    docs: combinedDocs,
    size: combinedDocs.length,
    empty: combinedDocs.length === 0,
  } as admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;
}

// ✅ Web Push VAPID 설정
const publicVapidKey = process.env.WEBPUSH_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.WEBPUSH_VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    "mailto:admin@philipandsophy.com",
    publicVapidKey,
    privateVapidKey
  );
  logger.info("Web Push VAPID keys configured in custom notifications");
} else {
  logger.warn(
    "Web Push VAPID keys are not configured in custom notifications. Web Push notifications will be skipped."
  );
}

/**
 * Helper: Send push notifications via dual-path strategy (FCM + Web Push)
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
          priority: "high",
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
    } catch (error) {
      logger.error("Error sending FCM push notification multicast", error as Error);
    }
  }

  // ✅ Send via Web Push (iOS Safari)
  const shouldSendWebPush = tokens.length === 0;

  if (shouldSendWebPush && webPushSubscriptions.length > 0 && publicVapidKey && privateVapidKey) {
    logger.info("Sending via Web Push (FCM not available)", {
      participantId,
      subscriptionCount: webPushSubscriptions.length,
    });

    for (const subscription of webPushSubscriptions) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon: NOTIFICATION_CONFIG.ICON_PATH,
          badge: NOTIFICATION_CONFIG.BADGE_PATH,
          url,
          type,
          tag: `${type}-${Date.now()}`,
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

        totalSuccessCount++;
        logger.info("Web Push notification sent successfully", {
          participantId,
          endpoint: subscription.endpoint.substring(0, 50),
        });
      } catch (error: any) {
        logger.error("Error sending Web Push notification", {
          participantId,
          error: error.message,
        });
      }
    }
  }

  return totalSuccessCount;
}

/**
 * sendCustomNotification
 *
 * 관리자가 특정 참가자들에게 커스텀 푸시 알림 전송
 *
 * Request Body:
 * {
 *   "cohortId": "1",  // 대상 코호트 ID (optional - participantIds와 함께 사용 안함)
 *   "participantIds": ["admin", "user1"],  // 대상 참가자 ID 배열 (optional)
 *   "title": "커스텀 알림 제목",
 *   "body": "커스텀 알림 내용",
 *   "route": "/app/chat",  // 클릭 시 이동 경로
 *   "type": "custom"  // 알림 타입
 * }
 */
export const sendCustomNotification = onRequest(
  { cors: true },
  async (request, response) => {
    // Only allow POST requests
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    // ✅ Authentication: Check internal secret OR Firebase ID Token
    const internalSecret = request.headers["x-internal-secret"] as string;
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;
    const isInternalCall = internalSecret && expectedSecret && internalSecret === expectedSecret;

    if (isInternalCall) {
      logger.info("Internal call authenticated via X-Internal-Secret");
    } else {
      // Fallback to Firebase ID Token authentication
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
    }

    const { cohortId, participantIds, title, body, route, type, includeAdmins = true } = request.body;

    // Validate required fields
    if (!title || !body || !route || !type) {
      response.status(400).json({
        error: "Missing required fields",
        message: "title, body, route, and type are required",
      });
      return;
    }

    // Must provide either cohortId or participantIds (unless admins-only mode)
    if (!cohortId && (!participantIds || participantIds.length === 0) && !includeAdmins) {
      response.status(400).json({
        error: "Missing recipients",
        message: "Either cohortId or participantIds must be provided",
      });
      return;
    }

    try {
      let targetParticipantIds: string[] = [];

      // Get participants by cohortId or use provided participantIds
      if (cohortId) {
        logger.info("Fetching participants by cohortId", { cohortId });
        const participantsSnapshot = await getCohortParticipants(cohortId);

        if (participantsSnapshot.empty) {
          response.status(404).json({
            error: "No participants found",
            message: `No participants found in cohort ${cohortId}`,
          });
          return;
        }

        targetParticipantIds = participantsSnapshot.docs.map(doc => doc.id);
      } else {
        targetParticipantIds = participantIds;
      }

      // ✅ 관리자 포함 여부에 따라 수신자 목록 확장
      let finalRecipientIds = targetParticipantIds;

      if (includeAdmins) {
        logger.info("Including administrators in custom notification");
        const adminsSnapshot = await getAllAdministrators();
        const adminIds = adminsSnapshot.docs.map(doc => doc.id);

        // 중복 제거 (Set 사용)
        const recipientSet = new Set([...targetParticipantIds, ...adminIds]);
        finalRecipientIds = Array.from(recipientSet);
      }

      logger.info("Sending custom notifications", {
        recipientCount: finalRecipientIds.length,
        includeAdmins,
        title,
        type,
        route,
      });

      // ✅ Send push notification using dual-path strategy (FCM + Web Push)
      let totalFCM = 0;
      let totalWebPush = 0;
      let totalSuccess = 0;

      const pushPromises = finalRecipientIds.map(async (participantId) => {
        // Get all tokens and subscriptions for this participant
        const { tokens, entriesMap, webPushSubscriptions } = await getPushTokens(participantId);

        if (tokens.length === 0 && webPushSubscriptions.length === 0) {
          logger.warn("No push tokens or subscriptions found", { participantId });
          return 0;
        }

        totalFCM += tokens.length;
        totalWebPush += webPushSubscriptions.length;

        // Send push notification via both FCM and Web Push
        const successCount = await sendPushNotificationMulticast(
          participantId,
          tokens,
          entriesMap,
          webPushSubscriptions,
          title,  // Custom title
          body,   // Custom body
          route,  // Custom route
          type    // Custom type
        );

        return successCount;
      });

      const results = await Promise.all(pushPromises);
      totalSuccess = results.reduce((sum: number, count: number) => sum + count, 0);

      logger.info("Custom notifications sent successfully (dual-path)", {
        cohortId: cohortId || "N/A",
        totalRecipients: finalRecipientIds.length,
        totalFCM,
        totalWebPush,
        totalSuccess,
        title,
        type,
      });

      response.status(200).json({
        success: true,
        totalRecipients: finalRecipientIds.length,
        totalFCM,
        totalWebPush,
        notificationsSent: totalSuccess,
        title,
        type,
      });
    } catch (error: any) {
      logger.error("Custom notification failed", error);
      response.status(500).json({
        error: "Failed to send custom notifications",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
