'use client';

/**
 * React Query Hooks for Cohorts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllCohorts,
  getActiveCohorts,
  getCohortById,
  createCohort,
  updateCohort,
  deleteCohort,
} from '@/lib/firebase';
import type { Cohort } from '@/types/database';

/**
 * Query keys for cohorts
 */
export const cohortKeys = {
  all: ['cohorts'] as const,
  active: ['cohorts', 'active'] as const,
  detail: (id: string) => ['cohorts', id] as const,
};

/**
 * Get all cohorts
 */
export const useAllCohorts = () => {
  return useQuery({
    queryKey: cohortKeys.all,
    queryFn: getAllCohorts,
  });
};

/**
 * Get active cohorts only
 */
export const useActiveCohorts = () => {
  return useQuery({
    queryKey: cohortKeys.active,
    queryFn: getActiveCohorts,
  });
};

/**
 * Get cohort by ID
 *
 * enabled 조건 제거: React Query가 자동으로 id 변화를 추적하고 쿼리를 실행합니다.
 * id가 없으면 queryFn에서 에러를 발생시켜 React Query의 error 상태로 처리합니다.
 */
export const useCohort = (id?: string) => {
  return useQuery({
    queryKey: cohortKeys.detail(id || ''),
    queryFn: () => {
      if (!id) {
        throw new Error('[useCohort] Cohort ID is required');
      }
      return getCohortById(id);
    },
    // enabled 조건 제거: id가 있으면 자동으로 쿼리 실행
  });
};

/**
 * Create cohort
 */
export const useCreateCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }) => createCohort(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohortKeys.all });
      queryClient.invalidateQueries({ queryKey: cohortKeys.active });
    },
  });
};

/**
 * Update cohort
 */
export const useUpdateCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Cohort, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => updateCohort(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cohortKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cohortKeys.all });
      queryClient.invalidateQueries({ queryKey: cohortKeys.active });
    },
  });
};

/**
 * Delete cohort
 */
export const useDeleteCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCohort(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohortKeys.all });
      queryClient.invalidateQueries({ queryKey: cohortKeys.active });
    },
  });
};
