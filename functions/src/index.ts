/**
 * Firebase Cloud Functions for PhilipandSophy
 *
 * Push Notification Triggers:
 * 1. onMessageCreated - DM 메시지 전송 시
 * 2. onNoticeCreated - 공지사항 작성 시
 * 3. sendMatchingNotifications - 매칭 결과 알림 (HTTP 함수)
 * 4. scheduledMatchingPreview - 매일 오전 5시 자동 매칭 프리뷰 (Scheduled 함수)
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineString } from "firebase-functions/params";
import { logger } from "./lib/logger";
import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  NOTIFICATION_TYPES,
} from "./constants/notifications";

// Global options for all functions
setGlobalOptions({
  region: "asia-northeast3", // Seoul region
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

// Initialize Firebase Admin
admin.initializeApp();

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
 * Helper: Get push token for a participant
 */
async function getPushToken(participantId: string): Promise<string | null> {
  try {
    const participantDoc = await admin
      .firestore()
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantDoc.exists) {
      logger.warn(`Participant not found: ${participantId}`);
      return null;
    }

    return participantDoc.data()?.pushToken || null;
  } catch (error) {
    logger.error(`Error getting push token for ${participantId}`, error as Error);
    return null;
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
 * Helper: Send push notification
 */
async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  url: string,
  type: string
): Promise<boolean> {
  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        url,
        type,
      },
      webpush: {
        notification: {
          icon: NOTIFICATION_CONFIG.ICON_PATH,
          badge: NOTIFICATION_CONFIG.BADGE_PATH,
        },
        fcmOptions: {
          link: url,
        },
        headers: {
          Urgency: NOTIFICATION_CONFIG.URGENCY,
        },
      },
    };

    await admin.messaging().send(message);
    logger.info(`Push notification sent to token: ${truncateToken(token)}`);
    return true;
  } catch (error: any) {
    // Handle expired or invalid token errors
    const expiredTokenErrors = [
      "messaging/registration-token-not-registered",
      "messaging/invalid-registration-token",
      "messaging/mismatched-credential",
      "messaging/invalid-apns-credentials",
    ];

    if (expiredTokenErrors.includes(error.code)) {
      logger.warn(`Push token invalid (${error.code}): ${truncateToken(token)}`);
      return false;
    }

    logger.error("Error sending push notification", error);
    return false;
  }
}

/**
 * Helper: Remove expired push token from Firestore
 */
async function removeExpiredToken(participantId: string): Promise<void> {
  try {
    await admin
      .firestore()
      .collection("participants")
      .doc(participantId)
      .update({
        pushToken: admin.firestore.FieldValue.delete(),
      });

    logger.info(`Removed expired push token for participant: ${participantId}`);
  } catch (error) {
    logger.error(`Error removing expired token for ${participantId}`, error as Error);
  }
}

/**
 * 1. DM 메시지 전송 시 푸시 알림
 *
 * Trigger: messages/{messageId} 문서 생성
 */
export const onMessageCreated = onDocumentCreated(
  "messages/{messageId}",
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

    // Get receiver's push token
    const pushToken = await getPushToken(receiverId);

    if (!pushToken) {
      logger.info(`No push token for receiver: ${receiverId}`);
      return;
    }

    // Truncate long messages
    const messagePreview = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // Send push notification
    const success = await sendPushNotification(
      pushToken,
      senderName,
      messagePreview,
      NOTIFICATION_ROUTES.CHAT,
      NOTIFICATION_TYPES.DM
    );

    // Remove expired token if send failed
    if (!success) {
      await removeExpiredToken(receiverId);
    }

    logger.info(`DM push notification processed for message: ${event.params.messageId}`);
  }
);

/**
 * 2. 공지사항 작성 시 푸시 알림
 *
 * Trigger: notices/{noticeId} 문서 생성
 */
export const onNoticeCreated = onDocumentCreated(
  "notices/{noticeId}",
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

    // Truncate long notice
    const noticePreview = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // Send push notification to all participants
    const pushPromises = participantsSnapshot.docs.map(async (doc) => {
      const participantId = doc.id;
      const pushToken = doc.data().pushToken;

      if (!pushToken) {
        return;
      }

      const success = await sendPushNotification(
        pushToken,
        NOTIFICATION_CONFIG.BRAND_NAME,
        NOTIFICATION_MESSAGES.NOTICE(noticePreview),
        NOTIFICATION_ROUTES.CHAT,
        NOTIFICATION_TYPES.NOTICE
      );

      // Remove expired token if send failed
      if (!success) {
        await removeExpiredToken(participantId);
      }
    });

    await Promise.all(pushPromises);

    logger.info(`Notice push notifications sent to ${participantsSnapshot.size} participants`);
  }
);

/**
 * 3. 매칭 결과 알림 (HTTP 함수)
 *
 * 매칭 확정 API에서 호출하는 함수
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

      // Send push notification to all participants
      const pushPromises = participantsSnapshot.docs.map(async (doc) => {
        const participantId = doc.id;
        const pushToken = doc.data().pushToken;

        if (!pushToken) {
          return false;
        }

        const success = await sendPushNotification(
          pushToken,
          NOTIFICATION_CONFIG.BRAND_NAME,
          NOTIFICATION_MESSAGES.MATCHING,
          NOTIFICATION_ROUTES.TODAY_LIBRARY,
          NOTIFICATION_TYPES.MATCHING
        );

        // Remove expired token if send failed
        if (!success) {
          await removeExpiredToken(participantId);
        }

        return success;
      });

      const results = await Promise.all(pushPromises);
      const successCount = results.filter((r) => r === true).length;

      logger.info(`Matching notifications sent: ${successCount}/${participantsSnapshot.size}`);

      response.status(200).json({
        success: true,
        totalParticipants: participantsSnapshot.size,
        notificationsSent: successCount,
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

      // 2. Preview API 호출
      logger.info(`Calling preview API for cohort: ${cohortId}`);

      const response = await fetch(`${apiBaseUrl}/api/admin/matching/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
