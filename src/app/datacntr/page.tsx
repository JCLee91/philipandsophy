'use client';

import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import { Users, BookOpen, Bell, FolderKanban, FileText, BellRing } from 'lucide-react';

export default function DataCenterPage() {
  const { data: stats, isLoading: statsLoading } = useDataCenterStats();
  const { data: activities, isLoading: activityLoading } = useActivityChart(7);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
        <p className="text-gray-600 mt-2">전체 서비스 현황을 한눈에 확인하세요</p>
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
    </div>
  );
}
