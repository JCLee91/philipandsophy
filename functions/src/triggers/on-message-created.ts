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
  getParticipantInfo,
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

    const senderInfo = await getParticipantInfo(senderId);
    const { tokens, entriesMap, webPushSubscriptions } = await getPushTokens(receiverId);

    if (tokens.length === 0 && webPushSubscriptions.length === 0) {
      logger.info(`No push tokens/subscriptions for receiver: ${receiverId}`);
      return;
    }

    // Determine title and icon based on sender type
    // Admin -> "필립앤소피" + Default Logo
    // User -> User Name + Profile Image (or default if missing)
    const title = senderInfo.isAdmin ? NOTIFICATION_CONFIG.BRAND_NAME : senderInfo.name;
    const icon = senderInfo.isAdmin ? undefined : (senderInfo.profileImageCircle || undefined);

    const messagePreview = truncateContent(content, NOTIFICATION_CONFIG.MAX_CONTENT_LENGTH);

    // Determine notification URL based on receiver type
    // - 관리자가 받는 알림 (유저→관리자): 문의함에서 해당 유저 대화 열기
    // - 유저가 받는 알림 (관리자→유저): 채팅 페이지에서 관리자 DM 대화창 열기
    const isReceiverAdmin = receiverId === 'admin';
    const notificationUrl = isReceiverAdmin
      ? `/app/admin/inquiries?userId=${senderId}`
      : `${NOTIFICATION_ROUTES.CHAT}?openDM=admin`;

    const successCount = await sendPushNotificationMulticast(
      receiverId,
      tokens,
      entriesMap,
      webPushSubscriptions,
      title,
      messagePreview,
      notificationUrl,
      NOTIFICATION_TYPES.DM,
      icon
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
