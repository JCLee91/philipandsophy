'use client';

import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export interface Insight {
  message: string;
  type: 'positive' | 'negative' | 'warning' | 'info';
  icon?: 'trend-up' | 'trend-down' | 'alert' | 'check';
}

interface InsightsPanelProps {
  insights: Insight[];
  isLoading?: boolean;
}

const insightConfig = {
  positive: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-600',
  },
  negative: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    iconColor: 'text-yellow-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
};

const iconMap = {
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  'alert': AlertTriangle,
  'check': CheckCircle,
};

export default function InsightsPanel({ insights, isLoading }: InsightsPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        💡 주요 인사이트
      </h3>

      <div className="space-y-3">
        {insights.map((insight, idx) => {
          const config = insightConfig[insight.type];
          const Icon = insight.icon ? iconMap[insight.icon] : null;

          return (
            <div
              key={idx}
              className={`rounded-lg p-4 border ${config.bg} ${config.border}`}
            >
              <div className="flex items-start gap-3">
                {Icon && (
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                )}
                <p className={`text-sm font-medium ${config.text} flex-1`}>
                  {insight.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI 스타일 푸터 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          자동 생성된 인사이트입니다
        </p>
      </div>
    </div>
  );
}

/**
 * 인사이트 자동 생성 헬퍼 함수
 */
export function generateInsights(stats: {
  totalParticipants: number;
  activeParticipants: number;
  dormantParticipants: number;
  weeklyParticipationRate: number;
  pushEnabledCount: number;
}): Insight[] {
  const insights: Insight[] = [];

  // 1. 주간 참여율 분석
  if (stats.weeklyParticipationRate >= 70) {
    insights.push({
      message: `이번 주 참여율이 ${stats.weeklyParticipationRate}%로 높습니다. 참가자들이 활발히 활동하고 있어요! 🎉`,
      type: 'positive',
      icon: 'check',
    });
  } else if (stats.weeklyParticipationRate < 50 && stats.totalParticipants > 0) {
    insights.push({
      message: `이번 주 참여율이 ${stats.weeklyParticipationRate}%로 저조합니다. 리마인드 메시지 발송을 고려해보세요.`,
      type: 'warning',
      icon: 'alert',
    });
  }

  // 2. 휴면 참가자 비율
  const dormantRate = stats.totalParticipants > 0
    ? Math.round((stats.dormantParticipants / stats.totalParticipants) * 100)
    : 0;

  if (dormantRate >= 30) {
    insights.push({
      message: `${stats.dormantParticipants}명의 참가자가 7일 이상 활동하지 않았습니다. (${dormantRate}%)`,
      type: 'negative',
      icon: 'trend-down',
    });
  } else if (dormantRate <= 10 && stats.totalParticipants > 0) {
    insights.push({
      message: `휴면 참가자 비율이 ${dormantRate}%로 매우 낮습니다. 훌륭한 운영이에요!`,
      type: 'positive',
      icon: 'check',
    });
  }

  // 3. 푸시 알림 허용 비율
  const pushEnabledRate = stats.totalParticipants > 0
    ? Math.round((stats.pushEnabledCount / stats.totalParticipants) * 100)
    : 0;

  if (pushEnabledRate < 50 && stats.totalParticipants > 0) {
    const pushDisabledCount = stats.totalParticipants - stats.pushEnabledCount;
    insights.push({
      message: `${pushDisabledCount}명이 푸시 알림을 허용하지 않았습니다. 알림 허용을 독려해보세요.`,
      type: 'info',
      icon: 'alert',
    });
  } else if (pushEnabledRate >= 80) {
    insights.push({
      message: `푸시 알림 허용률이 ${pushEnabledRate}%로 높습니다. 효과적으로 소통할 수 있어요!`,
      type: 'positive',
      icon: 'check',
    });
  }

  // 4. 활성 참가자 비율
  const activeRate = stats.totalParticipants > 0
    ? Math.round((stats.activeParticipants / stats.totalParticipants) * 100)
    : 0;

  if (activeRate >= 50) {
    insights.push({
      message: `${stats.activeParticipants}명이 최근 3일 내 활동했습니다. (${activeRate}%) 참가자 인게이지먼트가 우수합니다!`,
      type: 'positive',
      icon: 'trend-up',
    });
  }

  // 최대 4개만 표시
  return insights.slice(0, 4);
}
