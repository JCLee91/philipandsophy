'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createNotice,
  getNoticeById,
  getNoticesByCohort,
  getAllNotices,
  updateNotice,
  subscribeToNoticesByCohort,
} from '@/lib/firebase';
import { Notice } from '@/types/database';
import { CACHE_TIMES } from '@/constants/cache';
import { useEffect } from 'react';

/**
 * React Query hooks for Notice operations
 */

export const NOTICE_KEYS = {
  all: ['notices'] as const,
  lists: () => [...NOTICE_KEYS.all, 'list'] as const,
  list: () => [...NOTICE_KEYS.lists()] as const,
  byCohort: (cohortId: string) =>
    [...NOTICE_KEYS.all, 'cohort', cohortId] as const,
  details: () => [...NOTICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...NOTICE_KEYS.details(), id] as const,
};

/**
 * 모든 공지 조회
 */
export function useNotices() {
  return useQuery({
    queryKey: NOTICE_KEYS.list(),
    queryFn: getAllNotices,
  });
}

/**
 * 기수별 공지 조회 (실시간 구독)
 *
 * Slack/Discord 패턴: onSnapshot 실시간 구독
 * - 새 공지 즉시 반영
 * - staleTime: Infinity (실시간 구독이 업데이트)
 * - refetchOnWindowFocus: false (중복 구독 방지)
 */
type UseNoticesByCohortOptions = {
  initialData?: Notice[];
  enabled?: boolean;
};

export function useNoticesByCohort(
  cohortId: string | undefined,
  options?: UseNoticesByCohortOptions
) {
  const queryClient = useQueryClient();

  const enabled = options?.enabled ?? !!cohortId;

  // Initial fetch
  const query = useQuery({
    queryKey: NOTICE_KEYS.byCohort(cohortId || ''),
    queryFn: () => (cohortId ? getNoticesByCohort(cohortId) : []),
    enabled: enabled,
    // React Query 캐시 설정 (실시간 구독 최적화)
    staleTime: Infinity, // 실시간 구독으로 자동 업데이트
    refetchOnWindowFocus: false, // 실시간 구독 활성 (중복 구독 방지)
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: options?.initialData ?? undefined,
    placeholderData: (previousData) => previousData ?? options?.initialData,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!cohortId || !enabled) return undefined;

    // 이 effect가 여전히 활성 상태인지 추적 (경쟁 조건 방지)
    let isActive = true;
    const currentCohortId = cohortId;

    const unsubscribe = subscribeToNoticesByCohort(currentCohortId, (notices) => {
      // 이 구독이 여전히 활성 상태일 때만 업데이트
      if (isActive) {
        queryClient.setQueryData(NOTICE_KEYS.byCohort(currentCohortId), notices);
      }
    });

    return () => {
      isActive = false; // cleanup 시 비활성화
      unsubscribe();
    };
  }, [cohortId, queryClient, enabled]);

  return query;
}

/**
 * 공지 ID로 조회
 */
export function useNotice(id: string | undefined) {
  return useQuery({
    queryKey: NOTICE_KEYS.detail(id || ''),
    queryFn: () => (id ? getNoticeById(id) : null),
    enabled: !!id,
  });
}

/**
 * 공지 생성
 */
export function useCreateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      cohortId: string;
      author: string;
      content: string;
      isCustom: boolean;
      imageUrl?: string;
      templateId?: string;
      order?: number;
    }) => createNotice(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: NOTICE_KEYS.byCohort(variables.cohortId),
      });
    },
  });
}

/**
 * 공지 업데이트
 */
export function useUpdateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Notice, 'id' | 'createdAt'>>;
    }) => updateNotice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: NOTICE_KEYS.detail(variables.id),
      });
    },
  });
}

/**
 * 공지 삭제 (Firebase Auth 사용)
 */
export function useDeleteNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Firebase Auth ID Token 가져오기
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const auth = getFirebaseAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const idToken = await user.getIdToken();

      const response = await fetch(`/api/notices/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? '공지 삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      // 모든 공지 관련 쿼리 무효화 (lists와 cohort별 쿼리 모두)
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all });
    },
  });
}
