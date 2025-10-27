'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  createSubmission,
  getSubmissionsByParticipant,
  updateSubmission,
  deleteSubmission,
  subscribeParticipantSubmissions,
} from '@/lib/firebase';
import { ReadingSubmission } from '@/types/database';
import { CACHE_TIMES } from '@/constants/cache';

/**
 * React Query hooks for Reading Submission operations
 */

export const SUBMISSION_KEYS = {
  all: ['submissions'] as const,
  lists: () => [...SUBMISSION_KEYS.all, 'list'] as const,
  list: () => [...SUBMISSION_KEYS.lists()] as const,
  details: () => [...SUBMISSION_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SUBMISSION_KEYS.details(), id] as const,
  byParticipant: (participantId: string) =>
    [...SUBMISSION_KEYS.all, 'participant', participantId] as const,
  verifiedToday: () => [...SUBMISSION_KEYS.all, 'verified-today'] as const,
};


/**
 * 참가자별 제출물 조회
 */
export function useSubmissionsByParticipant(participantId: string | undefined) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.byParticipant(participantId || ''),
    queryFn: () =>
      participantId ? getSubmissionsByParticipant(participantId) : [],
    enabled: !!participantId,
    staleTime: CACHE_TIMES.SEMI_DYNAMIC, // 1분
  });
}

/**
 * 참가자별 제출물 실시간 구독 (프로필북용)
 * Firebase onSnapshot으로 즉시 반영
 */
type UseParticipantSubmissionsRealtimeOptions = {
  initialData?: ReadingSubmission[];
};

export function useParticipantSubmissionsRealtime(
  participantId: string | undefined,
  options?: UseParticipantSubmissionsRealtimeOptions
) {
  const initialData = options?.initialData ?? [];
  const [submissions, setSubmissions] = useState<ReadingSubmission[]>(initialData);
  const [isLoading, setIsLoading] = useState(() => {
    if (!participantId) return false;
    return initialData.length === 0;
  });

  useEffect(() => {
    if (options?.initialData) {
      setSubmissions(options.initialData);
      if (options.initialData.length > 0) {
        setIsLoading(false);
      }
    }
  }, [options?.initialData]);

  useEffect(() => {
    if (!participantId) {
      setSubmissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Firebase 실시간 구독
    const unsubscribe = subscribeParticipantSubmissions(
      participantId,
      (data) => {
        setSubmissions(data);
        setIsLoading(false);
      }
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [participantId]);

  return { data: submissions, isLoading };
}


/**
 * 제출물 생성
 */
export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<ReadingSubmission, 'id' | 'createdAt' | 'updatedAt' | 'submissionDate'>
    ) => createSubmission(data),
    onSuccess: async () => {
      // 모든 submission 관련 쿼리 무효화 (프로필북 포함)
      // await로 invalidation 완료 보장 (race condition 방지)
      await queryClient.invalidateQueries({
        queryKey: SUBMISSION_KEYS.all,
        refetchType: 'all', // active/inactive 상관없이 모든 쿼리 refetch
      });
    },
  });
}

/**
 * 제출물 업데이트
 */
export function useUpdateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<ReadingSubmission, 'id' | 'createdAt'>>;
    }) => updateSubmission(id, data),
    onSuccess: async () => {
      // 모든 submission 관련 쿼리 무효화 (프로필북 포함)
      await queryClient.invalidateQueries({
        queryKey: SUBMISSION_KEYS.all,
        refetchType: 'all',
      });
    },
  });
}


/**
 * 제출물 삭제
 */
export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: async () => {
      // 모든 submission 관련 쿼리 무효화 (프로필북 포함)
      await queryClient.invalidateQueries({
        queryKey: SUBMISSION_KEYS.all,
        refetchType: 'all',
      });
    },
  });
}
