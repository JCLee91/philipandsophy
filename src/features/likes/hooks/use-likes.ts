import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLike, fetchMyLikes, fetchReceivedLikes, fetchSubmissionsByIds } from '../api';
import { useToast } from '@/hooks/use-toast';
import { LikeData } from '../types';
import type { ReadingSubmission } from '@/types/database';

export function useLikes(currentUserId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 내가 누른 좋아요 목록
  const { data: myLikes = [], isLoading: isMyLikesLoading } = useQuery({
    queryKey: ['likes', 'sent', currentUserId],
    queryFn: () => fetchMyLikes(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 내가 받은 좋아요 목록
  const { data: receivedLikes = [], isLoading: isReceivedLikesLoading } = useQuery({
    queryKey: ['likes', 'received', currentUserId],
    queryFn: () => fetchReceivedLikes(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 모든 좋아요의 targetId 추출 (중복 제거)
  const allTargetIds = useMemo(() => {
    const ids = new Set<string>();
    myLikes.forEach(like => ids.add(like.targetId));
    receivedLikes.forEach(like => ids.add(like.targetId));
    // queryKey 안정성을 위해 정렬 (정렬 안 하면 createdAt 정렬 변화에 따라 key가 흔들릴 수 있음)
    return Array.from(ids).sort();
  }, [myLikes, receivedLikes]);

  // 좋아요한 글 내용 조회 (스크랩용)
  const { data: submissionsData, isLoading: isSubmissionsLoading } = useQuery({
    queryKey: ['likes', 'submissions', allTargetIds],
    queryFn: () => fetchSubmissionsByIds(allTargetIds),
    enabled: allTargetIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5분
  });
  
  // submissionsMap이 항상 Map 인스턴스가 되도록 보장
  const submissionsMap = useMemo(() => {
    if (submissionsData instanceof Map) {
      return submissionsData;
    }
    return new Map<string, ReadingSubmission>();
  }, [submissionsData]);

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
    onMutate: async ({ targetId, targetType, targetUserId }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['likes', 'sent', currentUserId] });
      const queryKey = ['likes', 'sent', currentUserId] as const;
      const previousLikes = queryClient.getQueryData<LikeData[]>(queryKey);
      const likeDocId = currentUserId ? `${currentUserId}_${targetId}` : `temp_${Date.now()}`;
      const hadLike = (previousLikes ?? []).some(l => l.targetId === targetId);
      const optimisticLike: LikeData = {
        id: likeDocId,
        userId: currentUserId!,
        targetId,
        targetType,
        targetUserId,
        createdAt: new Date(),
      };
      
      queryClient.setQueryData(queryKey, (old: LikeData[] = []) => {
        const exists = old.some(l => l.targetId === targetId);
        if (exists) return old.filter(l => l.targetId !== targetId);
        return [...old, optimisticLike];
      });
      
      return { previousLikes, hadLike, optimisticLike, queryKey };
    },
    onError: (err, variables, context) => {
      // 전체 롤백은 다른 target의 optimistic 업데이트를 덮어쓸 수 있으므로
      // "해당 targetId"만 되돌리는 방식으로 복구
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, (old: LikeData[] = []) => {
          const exists = old.some(l => l.targetId === variables.targetId);
          // onMutate에서 hadLike였다면 삭제가 optimistic이었으니 다시 추가
          if (context.hadLike) {
            return exists ? old : [...old, context.optimisticLike];
          }
          // onMutate에서 없었다면 추가가 optimistic이었으니 다시 삭제
          return exists ? old.filter(l => l.targetId !== variables.targetId) : old;
        });
      } else {
        queryClient.setQueryData(['likes', 'sent', currentUserId], context?.previousLikes);
      }
      toast({ title: '좋아요 처리에 실패했습니다.', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', 'sent', currentUserId] });
      // Note: We should also invalidate the target content to update counts, but we'll handle that via props or specialized hooks
    }
  });

  // 전체 로딩 상태 (모든 쿼리 + mutation)
  const isLoading = isMyLikesLoading || isReceivedLikesLoading || 
    (allTargetIds.length > 0 && isSubmissionsLoading);

  return {
    myLikes,
    receivedLikes,
    submissionsMap,
    isLiked,
    toggleLike: toggleLikeMutation.mutate,
    toggleLikeAsync: toggleLikeMutation.mutateAsync,
    isLoading,
    isMutating: toggleLikeMutation.isPending
  };
}
