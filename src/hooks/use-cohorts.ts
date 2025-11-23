'use client';

/**
 * React Query Hooks for Cohorts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  getAllCohorts,
  getActiveCohorts,
  getCohortById,
  updateCohort,
  subscribeToCohort,
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

// ❌ REMOVED: useCreateCohort - 미사용 hook 제거

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
 * Get cohort by ID with realtime updates
 */
export const useRealtimeCohort = (id?: string) => {
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setCohort(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToCohort(id, (data) => {
      setCohort(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  return { data: cohort, isLoading };
};

// ❌ REMOVED: useDeleteCohort - 미사용 hook 제거
