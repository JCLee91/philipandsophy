import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLike, fetchMyLikes, fetchReceivedLikes } from './api';
import { useToast } from '@/hooks/use-toast';
import { LikeData } from './types';

export function useLikes(currentUserId?: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // 내가 누른 좋아요 목록
  const { data: myLikes = [] } = useQuery({
    queryKey: ['likes', 'sent', currentUserId],
    queryFn: () => fetchMyLikes(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 내가 받은 좋아요 목록
  const { data: receivedLikes = [] } = useQuery({
    queryKey: ['likes', 'received', currentUserId],
    queryFn: () => fetchReceivedLikes(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 좋아요 상태 확인 (메모리상)
  const isLiked = useCallback((targetId: string) => {
    return myLikes.some(like => like.targetId === targetId);
  }, [myLikes]);

  // 좋아요 토글 Mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ 
      targetId, 
      targetType, 
      targetUserId 
    }: { 
      targetId: string; 
      targetType: 'review' | 'answer'; 
      targetUserId: string; 
    }) => {
      if (!currentUserId) throw new Error('User not logged in');
      return toggleLike(currentUserId, targetId, targetType, targetUserId);
    },
    onMutate: async ({ targetId }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['likes', 'sent', currentUserId] });
      const previousLikes = queryClient.getQueryData<LikeData[]>(['likes', 'sent', currentUserId]);
      
      queryClient.setQueryData(['likes', 'sent', currentUserId], (old: LikeData[] = []) => {
        const exists = old.find(l => l.targetId === targetId);
        if (exists) {
          return old.filter(l => l.targetId !== targetId);
        } else {
          return [...old, { 
            id: `temp_${Date.now()}`, 
            userId: currentUserId!, 
            targetId, 
            createdAt: new Date() 
          } as LikeData];
        }
      });
      
      return { previousLikes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['likes', 'sent', currentUserId], context?.previousLikes);
      showToast('좋아요 처리에 실패했습니다.', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', 'sent', currentUserId] });
      // Note: We should also invalidate the target content to update counts, but we'll handle that via props or specialized hooks
    }
  });

  return {
    myLikes,
    receivedLikes,
    isLiked,
    toggleLike: toggleLikeMutation.mutate,
    isLoading: toggleLikeMutation.isPending
  };
}
