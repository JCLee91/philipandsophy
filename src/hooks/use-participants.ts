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
type UseParticipantOptions = {
  initialData?: Participant | null;
};

export function useParticipant(id: string | undefined, options?: UseParticipantOptions) {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.detail(id || ''),
    queryFn: () => (id ? getParticipantById(id) : null),
    enabled: !!id,
    initialData: options?.initialData ?? undefined,
    placeholderData: options?.initialData ?? undefined,
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
 * 1. React Query 메모리 캐시 활용 (30분 staleTime)
 * 2. notifyOnChangeProps로 불필요한 리렌더링 방지
 *
 * 💡 사용처: 일반 페이지 (참가자 리스트 등)
 * 실시간 동기화가 필요한 경우 useParticipantsByCohortRealtime 사용
 */
type UseParticipantsByCohortOptions = {
  initialData?: Participant[];
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
};

export function useParticipantsByCohort(
  cohortId: string | undefined,
  options?: UseParticipantsByCohortOptions
) {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.byCohort(cohortId || ''),
    queryFn: () => (cohortId ? getParticipantsByCohort(cohortId) : []),
    enabled: options?.enabled ?? !!cohortId,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 60분
    refetchOnMount: false, // 마운트 시 자동 refetch 안 함
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false, // 창 포커스 시 refetch 안 함
    notifyOnChangeProps: ['data', 'error'],
    initialData: options?.initialData ?? undefined,
    placeholderData: options?.initialData ?? undefined,
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
