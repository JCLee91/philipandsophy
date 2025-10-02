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
  subscribeToMessages,
} from '@/lib/firebase';
import { useEffect } from 'react';
import type { DirectMessage } from '@/types/database';

/**
 * Query key factory for messages
 */
export const messageKeys = {
  all: ['messages'] as const,
  conversation: (conversationId: string) => ['messages', conversationId] as const,
  unread: (conversationId: string, userId: string) =>
    ['messages', 'unread', conversationId, userId] as const,
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
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(conversationId, (messages) => {
      queryClient.setQueryData(messageKeys.conversation(conversationId), messages);
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
    onSuccess: (_, variables) => {
      // Invalidate unread count
      queryClient.invalidateQueries({
        queryKey: messageKeys.unread(variables.conversationId, variables.userId),
      });
      // Optimistically update messages as read
      queryClient.setQueryData<DirectMessage[]>(
        messageKeys.conversation(variables.conversationId),
        (old) =>
          old?.map((msg) =>
            msg.receiverId === variables.userId ? { ...msg, isRead: true } : msg
          )
      );
    },
  });
};

/**
 * Get unread message count
 */
export const useUnreadCount = (conversationId: string, userId: string) => {
  return useQuery({
    queryKey: messageKeys.unread(conversationId, userId),
    queryFn: () => getUnreadCount(conversationId, userId),
    enabled: !!conversationId && !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
