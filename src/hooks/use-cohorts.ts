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
 * @param options.enabled - Enable/disable query (default: true)
 */
export const useAllCohorts = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: cohortKeys.all,
    queryFn: getAllCohorts,
    enabled: options?.enabled ?? true,
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
