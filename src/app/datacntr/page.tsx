'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCohorts } from '@/hooks/use-cohorts';
import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import AIChatPanel from '@/components/datacntr/AIChatPanel';
import { Users, BookOpen, Bell, FolderKanban, FileText, BellRing } from 'lucide-react';

export default function DataCenterPage() {
  const { user } = useAuth();
  const { data: cohorts = [], isLoading: cohortsLoading } = useAllCohorts();
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');

  // 활성 기수를 디폴트로 선택
  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      const activeCohort = cohorts.find(c => c.isActive);
      setSelectedCohortId(activeCohort?.id || cohorts[0].id);
    }
  }, [cohorts, selectedCohortId]);

  const { data: stats, isLoading: statsLoading } = useDataCenterStats(selectedCohortId);
  const { data: activities, isLoading: activityLoading } = useActivityChart(14, selectedCohortId);

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
          <p className="text-gray-600 mt-2">기수별 서비스 현황을 한눈에 확인하세요</p>
        </div>

        {/* 기수 선택 드롭다운 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">기수:</label>
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            disabled={cohortsLoading}
          >
            {cohorts.map(cohort => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} {cohort.isActive && '(활성)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="총 코호트"
          value={stats?.totalCohorts ?? 0}
          icon={FolderKanban}
          color="blue"
          isLoading={statsLoading}
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
          title="공지사항"
          value={stats?.totalNotices ?? 0}
          icon={Bell}
          color="blue"
          isLoading={statsLoading}
        />
      </div>

      {/* 활동 추이 그래프 */}
      <ActivityChart data={activities ?? []} isLoading={activityLoading} />

      {/* AI 데이터 분석 챗봇 */}
      <div className="mt-8">
        <AIChatPanel selectedCohortId={selectedCohortId} />
      </div>
    </div>
  );
}
