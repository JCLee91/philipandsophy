'use client';

import { useDatacntrStore } from '@/stores/datacntr-store';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import { LikesStats } from '@/types/datacntr';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import { Heart, Trophy, Users, Star } from 'lucide-react';
import RankingTable from '@/components/datacntr/likes/RankingTable';
import InteractionList from '@/components/datacntr/likes/InteractionList';
import ContentStats from '@/components/datacntr/likes/ContentStats';

export default function LikesAnalysisPage() {
    const { selectedCohortId } = useDatacntrStore();
    const { user } = useAuth();

    // 상세 통계 Fetching (detailed=true)
    const { data: stats, isLoading: isStatsLoading } = useQuery<LikesStats>({
        queryKey: ['datacntr', 'stats', 'likes', 'detailed', selectedCohortId],
        queryFn: async () => {
            if (!user) throw new Error('Auth required');
            const params = new URLSearchParams();
            if (selectedCohortId) params.append('cohortId', selectedCohortId);
            params.append('detailed', 'true');
            const res = await fetchWithTokenRefresh(`/api/datacntr/stats/likes?${params}`);
            if (!res.ok) throw new Error('Fetch failed');
            return res.json();
        },
        enabled: !!user,
    });

    if (isStatsLoading) {
        return <div className="p-8 text-center">Loading analysis...</div>;
    }

    if (!stats) return null;

    return (
        <div className="p-6 md:p-8 space-y-8 bg-gray-50/30 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">좋아요</h1>
                    <p className="text-gray-500 mt-1">커뮤니티 내 상호작용과 관심도를 심층 분석합니다.</p>
                </div>
            </div>

            {/* 1. 핵심 지표 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="총 좋아요"
                    value={stats.totalLikes}
                    icon={Heart}
                    trend={{ value: stats.todayLikes, label: "from today" }}
                    color="pink"
                />
                <MetricCard
                    title="인당 평균"
                    value={stats.likesPerUser}
                    subtitle="of all participants"
                    icon={Users}
                    color="blue"
                />
                <MetricCard
                    title="최다 인기글"
                    value={Math.max(stats.mostLikedReviews?.[0]?.likeCount || 0, stats.mostLikedAnswers?.[0]?.likeCount || 0)}
                    subtitle="likes on top post"
                    icon={Star}
                    color="orange"
                />
            </div>

            {/* 2. 랭킹 & 네트워크 (Grid Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Receivers */}
                <div className="lg:col-span-1">
                    <RankingTable
                        title="최다 수신 (Top 10)"
                        data={stats.topReceivers}
                        icon={<Trophy className="w-5 h-5 text-yellow-600" />}
                        colorClass="text-yellow-600 bg-yellow-100"
                    />
                </div>
                {/* Top Givers */}
                <div className="lg:col-span-1">
                    <RankingTable
                        title="최다 발신 (Top 10)"
                        data={stats.topGivers || []}
                        icon={<Heart className="w-5 h-5 text-pink-600" fill="currentColor" />}
                        colorClass="text-pink-600 bg-pink-100"
                    />
                </div>
                {/* Interaction Pairs */}
                <div className="lg:col-span-1 h-full">
                    <InteractionList pairs={stats.interactionPairs || []} />
                </div>
            </div>

            {/* 3. 콘텐츠 분석 */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8">콘텐츠 인사이트</h2>
                <ContentStats
                    typeStats={stats.contentTypeStats}
                    mostLikedReviews={stats.mostLikedReviews}
                    mostLikedAnswers={stats.mostLikedAnswers}
                />
            </div>
        </div>
    );
}
