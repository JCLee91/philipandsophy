'use client';

/**
 * React Query Hooks for Direct Messages
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createMessage,
  getMessagesByConversation,
  markConversationAsRead,
  getUnreadCount,
  getTotalUnreadCount,
  subscribeToMessages,
} from '@/lib/firebase';
import { useEffect } from 'react';
import type { DirectMessage } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * Query key factory for messages
 */
export const messageKeys = {
  all: ['messages'] as const,
  conversation: (conversationId: string) => ['messages', conversationId] as const,
  unread: (conversationId: string, userId: string) =>
    ['messages', 'unread', conversationId, userId] as const,
  total: (userId: string) => ['messages', 'unread', 'total', userId] as const,
};

/**
 * Get messages for a conversation with real-time updates
 */
export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();

  // Initial fetch
  const query = useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => getMessagesByConversation(conversationId),
    enabled: !!conversationId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return undefined;

    // 클로저로 현재 conversationId 고정 (race condition 방지)
    const currentConversationId = conversationId;

    const unsubscribe = subscribeToMessages(currentConversationId, (messages) => {
      // 구독 시점의 conversationId가 현재와 같을 때만 업데이트
      queryClient.setQueryData(messageKeys.conversation(currentConversationId), messages);
    });

    return () => unsubscribe();
  }, [conversationId, queryClient]);

  return query;
};

/**
 * Send a new message
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      senderId: string;
      receiverId: string;
      content: string;
      imageUrl?: string;
    }) => createMessage(data),
    onSuccess: (_, variables) => {
      // Invalidate conversation messages to trigger refetch
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(variables.conversationId),
      });
    },
  });
};

/**
 * Mark conversation as read
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      markConversationAsRead(conversationId, userId),
    onMutate: async (variables) => {
      // 낙관적 업데이트 전 진행 중인 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: messageKeys.conversation(variables.conversationId),
      });

      // 이전 데이터 백업 (롤백용)
      const previousMessages = queryClient.getQueryData<DirectMessage[]>(
        messageKeys.conversation(variables.conversationId)
      );

      // 낙관적 업데이트
      queryClient.setQueryData<DirectMessage[]>(
        messageKeys.conversation(variables.conversationId),
        (old) =>
          old?.map((msg) =>
            msg.receiverId === variables.userId ? { ...msg, isRead: true } : msg
          )
      );

      return { previousMessages };
    },
    onError: (error, variables, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageKeys.conversation(variables.conversationId),
          context.previousMessages
        );
      }
      logger.error('메시지 읽음 처리 실패:', error);
    },
    onSuccess: (_, variables) => {
      // Invalidate unread count 캐시
      queryClient.invalidateQueries({
        queryKey: messageKeys.unread(variables.conversationId, variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: messageKeys.total(variables.userId),
      });
    },
  });
};

/**
 * Get unread message count
 * refetchInterval과 staleTime 충돌 방지를 위해 staleTime: 0
 */
export const useUnreadCount = (conversationId: string, userId: string) => {
  return useQuery({
    queryKey: messageKeys.unread(conversationId, userId),
    queryFn: () => getUnreadCount(conversationId, userId),
    enabled: !!conversationId && !!userId && conversationId !== '-admin', // 빈 ID 쿼리 방지
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // refetchInterval 우선 적용
  });
};

/**
 * Get total unread message count for a user (all conversations)
 * refetchInterval과 staleTime 충돌 방지를 위해 staleTime: 0
 */
export const useTotalUnreadCount = (userId: string) => {
  return useQuery({
    queryKey: messageKeys.total(userId),
    queryFn: () => getTotalUnreadCount(userId),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // refetchInterval 우선 적용
  });
};
