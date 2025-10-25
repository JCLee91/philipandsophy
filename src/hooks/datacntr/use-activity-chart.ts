'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { DATACNTR_QUERY_CONFIG } from '@/constants/datacntr';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import type { DailyActivity } from '@/types/datacntr';

export function useActivityChart(days: number = DATACNTR_QUERY_CONFIG.DEFAULT_ACTIVITY_DAYS, cohortId?: string) {
  const { user } = useAuth();

  return useQuery<DailyActivity[]>({
    queryKey: ['datacntr', 'stats', 'activity', days, cohortId],
    queryFn: async () => {
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      const params = new URLSearchParams({ days: days.toString() });
      if (cohortId) {
        params.append('cohortId', cohortId);
      }

      const response = await fetchWithTokenRefresh(`/api/datacntr/stats/activity?${params}`);

      if (!response.ok) {
        throw new Error('활동 지표 조회 실패');
      }

      return response.json();
    },
    enabled: !!user, // cohortId는 선택사항 (undefined면 전체 조회)
    staleTime: DATACNTR_QUERY_CONFIG.ACTIVITY_STALE_TIME,
  });
}
