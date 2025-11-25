/**
 * 공지사항 작성 시 푸시 알림
 * Trigger: notices/{noticeId} 문서 생성
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "../lib/logger";
import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  NOTIFICATION_TYPES,
} from "../constants/notifications";
import {
  getCohortParticipants,
  getAllAdministrators,
  getPushTokens,
  truncateContent,
  sendPushNotificationMulticast,
} from "../lib/notification-helpers";

export const onNoticeCreated = onDocumentCreated(
  {
    document: "notices/{noticeId}",
    database: "seoul",
  },
  async (event) => {
    const noticeData = event.data?.data();

    if (!noticeData) {
      logger.error("No notice data found");
      return;
    }

    const { cohortId, content, status, title } = noticeData;

    // Skip push notifications for draft and scheduled notices
    if (status === 'draft' || status === 'scheduled') {
      logger.info(`${status} notice created, skipping push notifications`, {
        noticeId: event.params.noticeId,
        cohortId,
        status,
      });
      return;
    }

    if (!cohortId || !content) {
      logger.error("Missing required fields in notice data", { cohortId, hasContent: !!content });
      return;
    }

    const participantsSnapshot = await getCohortParticipants(cohortId);

    if (participantsSnapshot.empty) {
      logger.info(`No participants found in cohort: ${cohortId}`);
      return;
    }

    const adminsSnapshot = await getAllAdministrators();

    // Combine cohort participants + all admins (deduplicate by ID)
    const recipientMap = new Map<string, any>();

    participantsSnapshot.docs.forEach((doc) => {
      recipientMap.set(doc.id, doc);
    });

    adminsSnapshot.docs.forEach((doc) => {
      recipientMap.set(doc.id, doc);
    });

    const allRecipients = Array.from(recipientMap.values());

    logger.info(`Notice recipients`, {
      cohortParticipants: participantsSnapshot.size,
      administrators: adminsSnapshot.size,
      totalRecipients: allRecipients.length,
    });

    const noticeBody = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

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
        title || NOTIFICATION_MESSAGES.NOTICE_TITLE,
        noticeBody,
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
