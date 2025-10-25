'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { DATACNTR_QUERY_CONFIG } from '@/constants/datacntr';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import type { OverviewStats } from '@/types/datacntr';

export function useDataCenterStats(cohortId?: string) {
  const { user } = useAuth();

  return useQuery<OverviewStats>({
    queryKey: ['datacntr', 'stats', 'overview', cohortId],
    queryFn: async () => {
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      const url = cohortId
        ? `/api/datacntr/stats/overview?cohortId=${cohortId}`
        : '/api/datacntr/stats/overview';

      const response = await fetchWithTokenRefresh(url);

      if (!response.ok) {
        throw new Error('통계 조회 실패');
      }

      return response.json();
    },
    enabled: !!user, // cohortId는 선택사항 (undefined면 전체 조회)
    staleTime: DATACNTR_QUERY_CONFIG.STATS_STALE_TIME,
    refetchInterval: DATACNTR_QUERY_CONFIG.STATS_REFETCH_INTERVAL,
  });
}
