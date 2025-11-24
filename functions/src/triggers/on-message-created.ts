/**
 * DM 메시지 전송 시 푸시 알림
 * Trigger: messages/{messageId} 문서 생성
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "../lib/logger";
import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_ROUTES,
  NOTIFICATION_TYPES,
} from "../constants/notifications";
import {
  getPushTokens,
  truncateContent,
  getParticipantName,
  sendPushNotificationMulticast,
} from "../lib/notification-helpers";

export const onMessageCreated = onDocumentCreated(
  {
    document: "messages/{messageId}",
    database: "seoul",
  },
  async (event) => {
    const messageData = event.data?.data();

    if (!messageData) {
      logger.error("No message data found");
      return;
    }

    const { senderId, receiverId, content } = messageData;

    if (!senderId || !receiverId || !content) {
      logger.error("Missing required fields in message data", { senderId, receiverId, hasContent: !!content });
      return;
    }

    const senderName = await getParticipantName(senderId);
    const { tokens, entriesMap, webPushSubscriptions } = await getPushTokens(receiverId);

    if (tokens.length === 0 && webPushSubscriptions.length === 0) {
      logger.info(`No push tokens/subscriptions for receiver: ${receiverId}`);
      return;
    }

    const messagePreview = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

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
