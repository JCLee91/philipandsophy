import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import { LikesStats } from '@/types/datacntr';

export function useLikesStats(cohortId?: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['datacntr', 'stats', 'likes', cohortId],
        queryFn: async () => {
            if (!user) {
                throw new Error('로그인이 필요합니다');
            }

            const params = new URLSearchParams();
            if (cohortId) {
                params.append('cohortId', cohortId);
            }

            const response = await fetchWithTokenRefresh(`/api/datacntr/stats/likes?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch likes stats');
            }
            return response.json() as Promise<LikesStats>;
        },
        enabled: !!user,
        staleTime: 1000 * 60, // 1분
    });
}
