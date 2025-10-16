'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { DATACNTR_QUERY_CONFIG } from '@/constants/datacntr';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import type { DailyActivity } from '@/types/datacntr';

export function useActivityChart(days: number = DATACNTR_QUERY_CONFIG.DEFAULT_ACTIVITY_DAYS) {
  const { user } = useAuth();

  return useQuery<DailyActivity[]>({
    queryKey: ['datacntr', 'stats', 'activity', days],
    queryFn: async () => {
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      const response = await fetchWithTokenRefresh(`/api/datacntr/stats/activity?days=${days}`);

      if (!response.ok) {
        throw new Error('활동 지표 조회 실패');
      }

      return response.json();
    },
    enabled: !!user,
    staleTime: DATACNTR_QUERY_CONFIG.ACTIVITY_STALE_TIME,
  });
}
