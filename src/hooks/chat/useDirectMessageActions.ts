'use client';

import { useCallback, useState } from 'react';
import { useSendMessage, useMarkAsRead } from '@/hooks/use-messages';
import { uploadDMImage } from '@/lib/firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Participant } from '@/types/database';

const DM_IMAGE_ERROR = {
  DEFAULT: '이미지 업로드에 실패했습니다.',
  QUOTA: '스토리지 용량이 초과되었습니다. 관리자에게 문의하세요.',
  UNAUTHORIZED: '이미지 업로드 권한이 없습니다.',
} as const;

function mapDmImageError(error: unknown): string {
  if (!(error instanceof Error)) return DM_IMAGE_ERROR.DEFAULT;
  if (error.message.includes('storage/quota-exceeded')) {
    return DM_IMAGE_ERROR.QUOTA;
  }
  if (error.message.includes('storage/unauthorized')) {
    return DM_IMAGE_ERROR.UNAUTHORIZED;
  }
  return DM_IMAGE_ERROR.DEFAULT;
}

type UseDirectMessageActionsOptions = {
  conversationId: string;
  currentUserId: string;
  currentUser: Participant | null;
  otherUser: Participant | null;
};

type SendMessageParams = {
  content: string;
  imageFile: File | null;
};

type MarkAsReadParams = {
  userId: string;
};

export function useDirectMessageActions({
  conversationId,
  currentUserId,
  currentUser,
  otherUser,
}: UseDirectMessageActionsOptions) {
  const sendMessageMutation = useSendMessage();
  const markConversationAsRead = useMarkAsRead();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const sendMessage = useCallback(
    async ({ content, imageFile }: SendMessageParams) => {
      if ((!content.trim() && !imageFile) || !otherUser || !currentUser || !currentUserId || !conversationId) {
        return false;
      }

      try {
        setIsUploading(true);
        let imageUrl: string | undefined;

        if (imageFile) {
          try {
            imageUrl = await uploadDMImage(imageFile, currentUserId);
          } catch (error) {
            const message = mapDmImageError(error);
            toast({
              title: '이미지 업로드 실패',
              description: message,
              variant: 'destructive',
            });
            throw error;
          }
        }

        const receiverId = currentUser.isSuperAdmin || currentUser.isAdministrator ? otherUser.id : 'admin';

        await sendMessageMutation.mutateAsync({
          conversationId,
          senderId: currentUserId,
          receiverId,
          content,
          imageUrl,
        });

        return true;
      } catch (error) {
        logger.error('메시지 전송 실패:', error);
        if (!(error instanceof Error && error.message.includes('storage/'))) {
          toast({
            title: '메시지 전송 실패',
            description: '메시지를 전송하지 못했습니다. 다시 시도해주세요.',
            variant: 'destructive',
          });
        }
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [conversationId, currentUser, currentUserId, otherUser, sendMessageMutation, toast]
  );

  const markAsRead = useCallback(
    ({ userId }: MarkAsReadParams) => {
      if (!conversationId || !userId) return;
      markConversationAsRead.mutate({ conversationId, userId });
    },
    [conversationId, markConversationAsRead]
  );

  return {
    sendMessage,
    markAsRead,
    isUploading,
    isMarkingAsRead: markConversationAsRead.isPending,
  };
}

export type DirectMessageActions = ReturnType<typeof useDirectMessageActions>;
