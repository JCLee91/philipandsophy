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
 * Push token entry type
 */
interface PushTokenEntry {
  deviceId: string;
  token: string;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Helper: Get push tokens for a participant (supports multi-device)
 *
 * ✅ Updated to use pushTokens array for multi-device support
 *
 * @returns Object with tokens array and entries map for proper arrayRemove
 */
async function getPushTokens(participantId: string): Promise<{
  tokens: string[];
  entriesMap: Map<string, PushTokenEntry | null>;
}> {
  try {
    const participantDoc = await admin
      .firestore()
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantDoc.exists) {
      logger.warn(`Participant not found: ${participantId}`);
      return { tokens: [], entriesMap: new Map() };
    }

    const participantData = participantDoc.data();

    // ✅ Check pushNotificationEnabled flag first
    if (participantData?.pushNotificationEnabled === false) {
      logger.debug(`Push notifications disabled for participant: ${participantId}`);
      return { tokens: [], entriesMap: new Map() };
    }

    // ✅ Priority 1: Get tokens from pushTokens array
    const pushTokens: PushTokenEntry[] = participantData?.pushTokens || [];
    const tokens: string[] = [];
    const entriesMap = new Map<string, PushTokenEntry | null>();

    pushTokens.forEach((entry) => {
      tokens.push(entry.token);
      entriesMap.set(entry.token, entry); // Store actual Firestore entry
    });

    // ✅ Priority 2: Fallback to legacy pushToken if array is empty
    if (tokens.length === 0 && participantData?.pushToken) {
      tokens.push(participantData.pushToken);
      entriesMap.set(participantData.pushToken, null); // Legacy token has no entry
      logger.debug(`Using legacy pushToken for participant: ${participantId}`);
    }

    return { tokens, entriesMap };
  } catch (error) {
    logger.error(`Error getting push tokens for ${participantId}`, error as Error);
    return { tokens: [], entriesMap: new Map() };
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
 * Helper: Send push notification to multiple tokens (multi-device support)
 *
 * ✅ Updated to use multicast for sending to multiple devices
 * ✅ Automatically removes invalid/expired tokens from pushTokens array
 * ✅ Uses entriesMap for proper arrayRemove matching (fixes Timestamp.now() bug)
 *
 * @param participantId - Participant ID (for token cleanup)
 * @param tokens - Array of FCM tokens
 * @param entriesMap - Map of token strings to their Firestore entries (for proper arrayRemove)
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
  title: string,
  body: string,
  url: string,
  type: string
): Promise<number> {
  if (tokens.length === 0) {
    return 0;
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
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

    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info(`Push notification multicast sent`, {
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
            logger.warn(`Removing invalid/expired push token`, {
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

    return response.successCount;
  } catch (error) {
    logger.error("Error sending push notification multicast", error as Error);
    return 0;
  }
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
    const legacyPushToken: string | undefined = participantData?.pushToken;

    // Find token entries to remove from pushTokens array
    const tokensToRemove = pushTokens.filter((entry) =>
      failedTokens.includes(entry.token)
    );

    // Check if legacy pushToken is in failedTokens
    const shouldRemoveLegacyToken = legacyPushToken && failedTokens.includes(legacyPushToken);

    // If nothing to remove, return early
    if (tokensToRemove.length === 0 && !shouldRemoveLegacyToken) {
      return;
    }

    // Prepare update object
    const updateData: Record<string, any> = {};

    // Remove failed tokens from pushTokens array
    if (tokensToRemove.length > 0) {
      updateData.pushTokens = admin.firestore.FieldValue.arrayRemove(...tokensToRemove);
    }

    // ✅ Remove legacy pushToken field if it's invalid
    if (shouldRemoveLegacyToken) {
      updateData.pushToken = admin.firestore.FieldValue.delete();
      logger.info(`Removing legacy pushToken field for participant: ${participantId}`);
    }

    await participantRef.update(updateData);

    logger.info(`Removed expired tokens for participant: ${participantId}`, {
      arrayTokensRemoved: tokensToRemove.length,
      legacyTokenRemoved: shouldRemoveLegacyToken,
    });

    // ✅ If all tokens removed, disable push notifications
    const remainingTokens = pushTokens.filter(
      (entry) => !tokensToRemove.some((failed) => failed.token === entry.token)
    );

    // No tokens left in array AND no legacy token (or legacy token was removed)
    if (remainingTokens.length === 0 && (!legacyPushToken || shouldRemoveLegacyToken)) {
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

    // ✅ Get receiver's push tokens (multi-device support)
    const { tokens, entriesMap } = await getPushTokens(receiverId);

    if (tokens.length === 0) {
      logger.info(`No push tokens for receiver: ${receiverId}`);
      return;
    }

    // Truncate long messages
    const messagePreview = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // ✅ Send push notification to all devices
    const successCount = await sendPushNotificationMulticast(
      receiverId,
      tokens,
      entriesMap,
      senderName,
      messagePreview,
      NOTIFICATION_ROUTES.CHAT,
      NOTIFICATION_TYPES.DM
    );

    logger.info(`DM push notification processed`, {
      messageId: event.params.messageId,
      receiverId,
      totalDevices: tokens.length,
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

    // Truncate long notice for body
    const noticeBody = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // ✅ Send push notification to all participants (multi-device support)
    let totalDevices = 0;
    let totalSuccess = 0;

    const pushPromises = participantsSnapshot.docs.map(async (doc) => {
      const participantId = doc.id;

      // Get all tokens for this participant
      const { tokens, entriesMap } = await getPushTokens(participantId);

      if (tokens.length === 0) {
        return;
      }

      totalDevices += tokens.length;

      const successCount = await sendPushNotificationMulticast(
        participantId,
        tokens,
        entriesMap,
        NOTIFICATION_MESSAGES.NOTICE_TITLE, // Title: "새로운 공지가 등록되었습니다"
        noticeBody, // Body: 공지 내용
        NOTIFICATION_ROUTES.CHAT,
        NOTIFICATION_TYPES.NOTICE
      );

      totalSuccess += successCount;
    });

    await Promise.all(pushPromises);

    logger.info(`Notice push notifications sent`, {
      noticeId: event.params.noticeId,
      totalParticipants: participantsSnapshot.size,
      totalDevices,
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

      // ✅ Send push notification to all participants (multi-device support)
      let totalDevices = 0;
      let totalSuccess = 0;

      const pushPromises = participantsSnapshot.docs.map(async (doc) => {
        const participantId = doc.id;

        // Get all tokens for this participant
        const { tokens, entriesMap } = await getPushTokens(participantId);

        if (tokens.length === 0) {
          return 0;
        }

        totalDevices += tokens.length;

        const successCount = await sendPushNotificationMulticast(
          participantId,
          tokens,
          entriesMap,
          NOTIFICATION_MESSAGES.MATCHING_TITLE, // Title: "오늘의 프로필북이 도착했습니다"
          "새롭게 도착한 참가자들의 프로필 북을 확인해보세요", // Body: 설명
          NOTIFICATION_ROUTES.TODAY_LIBRARY,
          NOTIFICATION_TYPES.MATCHING
        );

        return successCount;
      });

      const results = await Promise.all(pushPromises);
      totalSuccess = results.reduce((sum, count) => sum + count, 0);

      logger.info(`Matching notifications sent`, {
        cohortId,
        date,
        totalParticipants: participantsSnapshot.size,
        totalDevices,
        totalSuccess,
      });

      response.status(200).json({
        success: true,
        totalParticipants: participantsSnapshot.size,
        totalDevices,
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
