'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { DATACNTR_QUERY_CONFIG } from '@/constants/datacntr';
import type { OverviewStats } from '@/types/datacntr';

export function useDataCenterStats() {
  const { user } = useAuth();

  return useQuery<OverviewStats>({
    queryKey: ['datacntr', 'stats', 'overview'],
    queryFn: async () => {
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      // Firebase Auth ID Token 가져오기 (forceRefresh: true로 항상 유효한 토큰 보장)
      const idToken = await user.getIdToken(true);

      const response = await fetch('/api/datacntr/stats/overview', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('통계 조회 실패');
      }

      return response.json();
    },
    enabled: !!user,
    staleTime: DATACNTR_QUERY_CONFIG.STATS_STALE_TIME,
    refetchInterval: DATACNTR_QUERY_CONFIG.STATS_REFETCH_INTERVAL,
  });
}
