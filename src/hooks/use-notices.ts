'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createNotice,
  getNoticeById,
  getNoticesByCohort,
  getAllNotices,
  updateNotice,
  toggleNoticePin,
  deleteNotice,
} from '@/lib/firebase';
import { Notice } from '@/types/database';
import { CACHE_TIMES } from '@/constants/cache';

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
 * 기수별 공지 조회
 *
 * staleTime을 1분으로 설정하여 새 공지를 빠르게 확인 가능
 * (글로벌 기본값 5분을 override)
 */
export function useNoticesByCohort(cohortId: string | undefined) {
  return useQuery({
    queryKey: NOTICE_KEYS.byCohort(cohortId || ''),
    queryFn: () => (cohortId ? getNoticesByCohort(cohortId) : []),
    enabled: !!cohortId,
    staleTime: CACHE_TIMES.SEMI_DYNAMIC, // 1분
  });
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
      imageUrl?: string;
      isPinned?: boolean;
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
 * 공지 고정 토글
 */
export function useToggleNoticePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleNoticePin(id),
    onSuccess: () => {
      // 모든 공지 관련 쿼리 무효화 (lists와 cohort별 쿼리 모두)
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all });
    },
  });
}

/**
 * 공지 삭제
 */
export function useDeleteNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.lists() });
    },
  });
}
