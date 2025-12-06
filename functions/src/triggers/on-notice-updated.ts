/**
 * 공지사항 업데이트 시 푸시 알림 (임시저장 → 발행)
 * Trigger: notices/{noticeId} 문서 업데이트
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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

export const onNoticeUpdated = onDocumentUpdated(
  {
    document: "notices/{noticeId}",
    database: "seoul",
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

    // Only send notifications when (draft OR scheduled) → published
    const isPublishing = newStatus === 'published' && (oldStatus === 'draft' || oldStatus === 'scheduled');

    if (!isPublishing) {
      logger.debug('Notice updated but status change not publishing, skipping push', {
        noticeId: event.params.noticeId,
        oldStatus,
        newStatus,
      });
      return;
    }

    logger.info(`Notice published (from ${oldStatus}), sending push notifications`, {
      noticeId: event.params.noticeId,
      cohortId: afterData.cohortId,
    });

    const { cohortId, content, title } = afterData;

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

    const recipientMap = new Map<string, any>();

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
        `${NOTIFICATION_ROUTES.CHAT}?cohort=${cohortId}`, // ✅ Append cohort param for correct redirection
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
