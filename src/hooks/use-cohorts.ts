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

type UseAllCohortsOptions = {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
};

/**
 * Get all cohorts
 * @param options.enabled - Enable/disable query (default: true)
 * @param options.refetchOnWindowFocus - Control window focus refetch (default: false)
 */
export const useAllCohorts = (options?: UseAllCohortsOptions) => {
  return useQuery({
    queryKey: cohortKeys.all,
    queryFn: getAllCohorts,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  });
};

/**
 * Get active cohorts only
 */
type UseActiveCohortsOptions = {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
};

export const useActiveCohorts = (options?: UseActiveCohortsOptions) => {
  return useQuery({
    queryKey: cohortKeys.active,
    queryFn: getActiveCohorts,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: 2, // 실패 시 2번 자동 재시도
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // 1초, 2초, 3초
    staleTime: 30000, // 30초 동안 캐시 사용
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};

/**
 * Get cohort by ID
 */
type UseCohortOptions = {
  initialData?: Cohort | null;
};

export const useCohort = (id?: string, options?: UseCohortOptions) => {
  return useQuery({
    queryKey: cohortKeys.detail(id || ''),
    queryFn: () => getCohortById(id!),
    enabled: !!id,
    initialData: options?.initialData ?? undefined,
    placeholderData: options?.initialData ?? undefined,
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
