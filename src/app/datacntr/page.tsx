'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCohorts } from '@/hooks/use-cohorts';
import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import { useDatacntrStore } from '@/stores/datacntr-store';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import CohortDateBanner from '@/components/datacntr/dashboard/CohortDateBanner';
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
    if (cohorts.length > 0 && selectedCohortId === null) {
      // 1. 활성 기수만 필터링
      let activeCohorts = cohorts.filter(c => c.isActive);

      // 2. 테스트 기수(0기) 제외
      activeCohorts = activeCohorts.filter(c => c.id !== '0');

      // 3. 시작일 기준 내림차순 정렬 (최신순)
      activeCohorts.sort((a, b) => b.startDate.localeCompare(a.startDate));

      // 4. 최신 기수 선택 (없으면 전체 기수 중 0기 제외하고 최신순)
      if (activeCohorts.length > 0) {
        setSelectedCohortId(activeCohorts[0].id);
      } else {
        // 활성 기수가 하나도 없으면, 전체 중 0기 제외하고 최신순
        const fallbackCohorts = cohorts
          .filter(c => c.id !== '0')
          .sort((a, b) => b.startDate.localeCompare(a.startDate));

        if (fallbackCohorts.length > 0) {
          setSelectedCohortId(fallbackCohorts[0].id);
        } else {
          // 정말 아무것도 없으면 그냥 첫 번째 (0기라도)
          setSelectedCohortId(cohorts[0].id);
        }
      }
    }
  }, [cohorts, selectedCohortId, setSelectedCohortId]);

  // 선택된 cohortId로 통계 조회
  const statsSelectedCohortId = selectedCohortId || undefined;

  const { data: stats, isLoading: statsLoading } = useDataCenterStats(statsSelectedCohortId);
  const { data: activities, isLoading: activityLoading } = useActivityChart(14, statsSelectedCohortId);

  const selectedCohort = statsSelectedCohortId ? cohorts.find(c => c.id === statsSelectedCohortId) : undefined;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
        <p className="text-gray-600 mt-2">
          {selectedCohort ? `${selectedCohort.name} 기수 현황` : '기수별 서비스 현황을 한눈에 확인하세요'}
        </p>
      </div>

      {/* 기수 일정 배너 */}
      {selectedCohort && (
        <CohortDateBanner
          startDate={selectedCohort.startDate}
          endDate={selectedCohort.endDate}
          programStartDate={selectedCohort.programStartDate}
          cohortName={selectedCohort.name}
          isLoading={cohortsLoading}
        />
      )}

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
