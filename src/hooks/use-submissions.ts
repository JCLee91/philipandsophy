'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSubmission,
  getSubmissionById,
  getSubmissionsByParticipant,
  getSubmissionsByCode,
  getAllSubmissions,
  getSubmissionsByStatus,
  updateSubmission,
  updateSubmissionStatus,
  deleteSubmission,
} from '@/lib/firebase';
import { ReadingSubmission } from '@/types/database';

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
  byCode: (code: string) => [...SUBMISSION_KEYS.all, 'code', code] as const,
  byStatus: (status: string) =>
    [...SUBMISSION_KEYS.all, 'status', status] as const,
  verifiedToday: () => [...SUBMISSION_KEYS.all, 'verified-today'] as const,
};

/**
 * 모든 제출물 조회
 */
export function useSubmissions() {
  return useQuery({
    queryKey: SUBMISSION_KEYS.list(),
    queryFn: getAllSubmissions,
  });
}

/**
 * 제출물 ID로 조회
 */
export function useSubmission(id: string | undefined) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.detail(id || ''),
    queryFn: () => (id ? getSubmissionById(id) : null),
    enabled: !!id,
  });
}

/**
 * 참가자별 제출물 조회
 */
export function useSubmissionsByParticipant(participantId: string | undefined) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.byParticipant(participantId || ''),
    queryFn: () =>
      participantId ? getSubmissionsByParticipant(participantId) : [],
    enabled: !!participantId,
  });
}

/**
 * 참여코드별 제출물 조회
 */
export function useSubmissionsByCode(code: string | undefined) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.byCode(code || ''),
    queryFn: () => (code ? getSubmissionsByCode(code) : []),
    enabled: !!code,
  });
}

/**
 * 상태별 제출물 조회
 */
export function useSubmissionsByStatus(
  status: 'pending' | 'approved' | 'rejected'
) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.byStatus(status),
    queryFn: () => getSubmissionsByStatus(status),
  });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.lists() });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: SUBMISSION_KEYS.detail(variables.id),
      });
    },
  });
}

/**
 * 제출물 상태 업데이트
 */
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      reviewNote?: string;
    }) => updateSubmissionStatus(id, status, reviewNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.lists() });
    },
  });
}
