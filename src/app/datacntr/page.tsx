'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCohorts } from '@/hooks/use-cohorts';
import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import { useDatacntrStore } from '@/stores/datacntr-store';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import AIChatPanel from '@/components/datacntr/AIChatPanel';
import { Users, BookOpen, FileText, BellRing, TrendingUp } from 'lucide-react';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
export default function DataCenterPage() {
  const { user } = useAuth();
  const { data: cohorts = [], isLoading: cohortsLoading } = useAllCohorts();
  const { selectedCohortId, setSelectedCohortId } = useDatacntrStore();

  // 첫 로드 시 활성 기수를 디폴트로 선택 (selectedCohortId가 없으면)
  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      const activeCohort = cohorts.find(c => c.isActive);
      setSelectedCohortId(activeCohort?.id || cohorts[0].id);
    }
  }, [cohorts, selectedCohortId, setSelectedCohortId]);

  // 'all' 선택 시 cohortId를 전달하지 않음 (전체 조회)
  const statsSelectedCohortId = selectedCohortId === 'all' ? undefined : selectedCohortId;

  const { data: stats, isLoading: statsLoading } = useDataCenterStats(statsSelectedCohortId);
  const { data: activities, isLoading: activityLoading } = useActivityChart(14, statsSelectedCohortId);

  const selectedCohort = statsSelectedCohortId ? cohorts.find(c => c.id === statsSelectedCohortId) : undefined;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
        <p className="text-gray-600 mt-2">
          {selectedCohort ? `${selectedCohort.name} 기수 현황` : selectedCohortId === 'all' ? '전체 기수 통합 현황' : '기수별 서비스 현황을 한눈에 확인하세요'}
        </p>
      </div>

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="평균 독서 인증"
          value={stats?.averageSubmissionsPerParticipant ?? 0}
          icon={BookOpen}
          color="blue"
          isLoading={statsLoading}
          subtitle="회/인"
        />
        <MetricCard
          title="총 참가자"
          value={stats?.totalParticipants ?? 0}
          icon={Users}
          color="green"
          isLoading={statsLoading}
        />
        <MetricCard
          title="푸시 알림 허용"
          value={stats?.pushEnabledCount ?? 0}
          icon={BellRing}
          color="purple"
          isLoading={statsLoading}
        />
        <MetricCard
          title="오늘 인증"
          value={stats?.todaySubmissions ?? 0}
          icon={BookOpen}
          color="orange"
          isLoading={statsLoading}
        />
        <MetricCard
          title="전체 인증"
          value={stats?.totalSubmissions ?? 0}
          icon={FileText}
          color="pink"
          isLoading={statsLoading}
        />
        <MetricCard
          title="총 인증률"
          value={stats?.totalSubmissionRate ?? 0}
          icon={TrendingUp}
          color="blue"
          isLoading={statsLoading}
          subtitle="%"
        />
      </div>

      {/* 활동 추이 그래프 */}
      <ActivityChart
        data={activities ?? []}
        isLoading={activityLoading}
        cohortName={selectedCohort?.name}
        cohortStartDate={selectedCohort?.startDate}
        cohortEndDate={selectedCohort?.endDate}
      />

      {/* AI 데이터 분석 챗봇 */}
      <div className="mt-8">
        <AIChatPanel selectedCohortId={selectedCohortId} />
      </div>
    </div>
  );
}
