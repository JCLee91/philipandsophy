'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import AlertPanel from '@/components/datacntr/common/AlertPanel';
import InsightsPanel from '@/components/datacntr/common/InsightsPanel';
import { Loader2, Users, BookOpen, MessageSquare, Bell, FolderKanban, FileText, BellRing } from 'lucide-react';

export default function DataCenterPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDataCenterStats();
  const { data: activities, isLoading: activityLoading } = useActivityChart(7);

  // Alert 생성 로직 (푸시 알림만)
  const alerts = useMemo(() => {
    if (!stats) return [];

    const alertList: Array<{
      message: string;
      severity: 'warning' | 'danger' | 'info';
      action?: { label: string; onClick: () => void };
    }> = [];

    // 푸시 알림 미허용 경고 (50% 이상)
    const pushDisabledCount = stats.totalParticipants - stats.pushEnabledCount;
    const pushDisabledRate = stats.totalParticipants > 0
      ? (pushDisabledCount / stats.totalParticipants) * 100
      : 0;

    if (pushDisabledRate >= 50) {
      alertList.push({
        message: `${pushDisabledCount}명이 푸시 알림을 허용하지 않았습니다. 알림 허용을 유도해보세요.`,
        severity: 'info',
      });
    }

    return alertList;
  }, [stats, router]);

  // AI 인사이트 생성 (푸시 알림만)
  const insights = useMemo(() => {
    if (!stats) return [];

    const insightList: Array<{
      message: string;
      type: 'positive' | 'negative' | 'warning' | 'info';
      icon?: 'trend-up' | 'trend-down' | 'alert' | 'check';
    }> = [];

    // 푸시 알림 허용률 분석
    const pushEnabledRate = stats.totalParticipants > 0
      ? Math.round((stats.pushEnabledCount / stats.totalParticipants) * 100)
      : 0;

    if (pushEnabledRate < 50 && stats.totalParticipants > 0) {
      const pushDisabledCount = stats.totalParticipants - stats.pushEnabledCount;
      insightList.push({
        message: `${pushDisabledCount}명이 푸시 알림을 허용하지 않았습니다. 알림 허용을 독려해보세요.`,
        type: 'info',
        icon: 'alert',
      });
    } else if (pushEnabledRate >= 80) {
      insightList.push({
        message: `푸시 알림 허용률이 ${pushEnabledRate}%로 높습니다. 효과적으로 소통할 수 있어요!`,
        type: 'positive',
        icon: 'check',
      });
    }

    return insightList;
  }, [stats]);

  // 로그인 체크 - 로그인 안 되어 있으면 로그인 페이지로
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 인증 확인 중
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 로그인 안 되어 있으면 리다이렉트됨
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
        <p className="text-gray-600 mt-2">전체 서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽 열: 메트릭 + 차트 (2/3 너비) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 통계 메트릭 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <MetricCard
              title="메시지"
              value={stats?.totalMessages ?? 0}
              icon={MessageSquare}
              color="gray"
              isLoading={statsLoading}
            />
          </div>

          {/* 활동 추이 그래프 */}
          <ActivityChart data={activities ?? []} isLoading={activityLoading} />
        </div>

        {/* 오른쪽 열: Alert + 인사이트 (1/3 너비) */}
        <div className="space-y-6">
          {/* 주의 필요 알림 */}
          <AlertPanel alerts={alerts} />

          {/* AI 인사이트 */}
          <InsightsPanel insights={insights} isLoading={statsLoading} />
        </div>
      </div>
    </div>
  );
}
