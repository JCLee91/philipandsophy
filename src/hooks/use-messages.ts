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
    // React Query 캐시 설정 (실시간 구독 최적화)
    gcTime: 5 * 60 * 1000, // 5분 후 메모리에서 삭제 (깨진 캐시 정리)
    staleTime: Infinity, // 실시간 구독으로 자동 업데이트 (중복 구독 방지)
    refetchOnMount: false, // 캐시 재사용 (실시간 구독이 최신 상태 유지)
    refetchOnWindowFocus: false, // 포커스 시 refetch 안 함 (실시간 구독 활성)
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return undefined;

    // 이 effect가 여전히 활성 상태인지 추적 (경쟁 조건 방지)
    let isActive = true;
    const currentConversationId = conversationId;

    const unsubscribe = subscribeToMessages(currentConversationId, (messages) => {
      // 이 구독이 여전히 활성 상태일 때만 업데이트
      // (사용자가 다른 대화방으로 이동한 경우 업데이트 무시)
      if (isActive) {
        queryClient.setQueryData(messageKeys.conversation(currentConversationId), messages);
      }
    });

    return () => {
      isActive = false; // cleanup 시 비활성화
      unsubscribe();
    };
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
