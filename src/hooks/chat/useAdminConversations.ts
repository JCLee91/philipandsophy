import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { subscribeToAdminConversations } from '@/lib/firebase/messages';
import type { Conversation } from '@/types/database';

export const conversationKeys = {
  all: ['admin-conversations'] as const,
};

export const useAdminConversations = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const isEnabled = options?.enabled ?? true;

  // React Query for caching and state management
  const query = useQuery({
    queryKey: conversationKeys.all,
    queryFn: () => Promise.resolve([] as Conversation[]), // Initial empty state, data comes from subscription
    enabled: isEnabled,
    staleTime: Infinity,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isEnabled) return;

    const unsubscribe = subscribeToAdminConversations((conversations) => {
      queryClient.setQueryData(conversationKeys.all, conversations);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, isEnabled]);

  return query;
};

