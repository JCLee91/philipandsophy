'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createParticipant,
  getParticipantById,
  getParticipantByPhoneNumber,
  getParticipantsByCohort,
  getAllParticipants,
  updateParticipant,
  deleteParticipant,
} from '@/lib/firebase';
import { Participant } from '@/types/database';

/**
 * React Query hooks for Participant operations
 */

export const PARTICIPANT_KEYS = {
  all: ['participants'] as const,
  lists: () => [...PARTICIPANT_KEYS.all, 'list'] as const,
  list: () => [...PARTICIPANT_KEYS.lists()] as const,
  details: () => [...PARTICIPANT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PARTICIPANT_KEYS.details(), id] as const,
  byPhone: (phone: string) => [...PARTICIPANT_KEYS.all, 'phone', phone] as const,
  byCohort: (cohortId: string) => [...PARTICIPANT_KEYS.all, 'cohort', cohortId] as const,
};

/**
 * 모든 참가자 조회
 */
export function useParticipants() {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.list(),
    queryFn: getAllParticipants,
  });
}

/**
 * 참가자 ID로 조회
 */
export function useParticipant(id: string | undefined) {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.detail(id || ''),
    queryFn: () => (id ? getParticipantById(id) : null),
    enabled: !!id,
  });
}

/**
 * 전화번호로 조회
 */
export function useParticipantByPhone(phoneNumber: string | undefined) {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.byPhone(phoneNumber || ''),
    queryFn: () => (phoneNumber ? getParticipantByPhoneNumber(phoneNumber) : null),
    enabled: !!phoneNumber && phoneNumber.length > 0,
  });
}

/**
 * 기수별 참가자 조회
 *
 * ✅ 최적화 전략:
 * 1. React Query 캐시 우선 활용 (30분 staleTime)
 * 2. Firestore IndexedDB 캐시 우선 읽기 (getDocsFromCache)
 * 3. notifyOnChangeProps로 불필요한 리렌더링 방지
 */
export function useParticipantsByCohort(cohortId: string | undefined) {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.byCohort(cohortId || ''),
    queryFn: () => (cohortId ? getParticipantsByCohort(cohortId) : []),
    enabled: !!cohortId,
    // Firestore 캐시 우선 전략과 함께 사용
    staleTime: 30 * 60 * 1000, // 30분 (증가)
    gcTime: 60 * 60 * 1000, // 60분 (증가)
    refetchOnMount: false, // 마운트 시 자동 refetch 안 함 (캐시 활용)
    refetchOnWindowFocus: false, // 창 포커스 시 refetch 안 함
    // ✅ Solution 1-A: 데이터만 감시하여 불필요한 로딩 상태 리렌더링 방지
    notifyOnChangeProps: ['data', 'error'],
  });
}

/**
 * 참가자 생성
 */
export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>) =>
      createParticipant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTICIPANT_KEYS.lists() });
    },
  });
}

/**
 * 참가자 정보 업데이트
 */
export function useUpdateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Participant, 'id' | 'createdAt'>>;
    }) => updateParticipant(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PARTICIPANT_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: PARTICIPANT_KEYS.detail(variables.id),
      });
    },
  });
}

/**
 * 참가자 삭제
 */
export function useDeleteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteParticipant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTICIPANT_KEYS.lists() });
    },
  });
}
