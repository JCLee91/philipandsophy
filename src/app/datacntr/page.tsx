'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import AlertPanel from '@/components/datacntr/common/AlertPanel';
import ParticipantStatusChart from '@/components/datacntr/dashboard/ParticipantStatusChart';
import { Loader2, Users, BookOpen, MessageSquare, Bell, FolderKanban, FileText, BellRing } from 'lucide-react';

export default function DataCenterPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDataCenterStats();
  const { data: activities, isLoading: activityLoading } = useActivityChart(7);

  // Alert 생성 로직
  const alerts = useMemo(() => {
    if (!stats) return [];

    const alertList: Array<{
      message: string;
      severity: 'warning' | 'danger' | 'info';
      action?: { label: string; onClick: () => void };
    }> = [];

    // 휴면 참가자 경고 (30% 이상)
    const dormantRate = stats.totalParticipants > 0
      ? (stats.dormantParticipants / stats.totalParticipants) * 100
      : 0;

    if (dormantRate >= 30) {
      alertList.push({
        message: `휴면 참가자가 ${stats.dormantParticipants}명 (${Math.round(dormantRate)}%)입니다. 리마인드 메시지를 전송해보세요.`,
        severity: 'warning',
        action: {
          label: '메시지 보내기',
          onClick: () => router.push('/datacntr/messages'),
        },
      });
    }

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

    // 주간 참여율 저조 경고 (50% 미만)
    if (stats.weeklyParticipationRate < 50 && stats.totalParticipants > 0) {
      alertList.push({
        message: `이번 주 참여율이 ${stats.weeklyParticipationRate}%로 저조합니다. 독려가 필요합니다.`,
        severity: 'danger',
      });
    }

    return alertList;
  }, [stats, router]);

  // 참가자 상태 차트 데이터
  const participantStatusData = useMemo(() => {
    if (!stats) return { active: 0, moderate: 0, dormant: 0 };

    return {
      active: stats.activeParticipants,
      moderate: stats.moderateParticipants,
      dormant: stats.dormantParticipants,
    };
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
            <MetricCard
              title="주간 참여율"
              value={`${stats?.weeklyParticipationRate ?? 0}%`}
              icon={Users}
              color="green"
              isLoading={statsLoading}
            />
          </div>

          {/* 활동 추이 그래프 */}
          <ActivityChart data={activities ?? []} isLoading={activityLoading} />
        </div>

        {/* 오른쪽 열: Alert + 상태 차트 (1/3 너비) */}
        <div className="space-y-6">
          {/* 주의 필요 알림 */}
          <AlertPanel alerts={alerts} />

          {/* 참가자 활동 상태 */}
          <ParticipantStatusChart data={participantStatusData} isLoading={statsLoading} />
        </div>
      </div>
    </div>
  );
}
