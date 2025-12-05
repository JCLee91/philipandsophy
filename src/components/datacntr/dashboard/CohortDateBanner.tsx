'use client';

import { format, differenceInDays, isWithinInterval, parseISO, isBefore, isAfter } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle2, Timer } from 'lucide-react';

interface CohortDateBannerProps {
  startDate: string;
  endDate: string;
  programStartDate?: string;
  cohortName: string;
  isLoading?: boolean;
}

export default function CohortDateBanner({
  startDate,
  endDate,
  programStartDate,
  cohortName,
  isLoading,
}: CohortDateBannerProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mb-6">
        <div className="h-6 w-48 shimmer rounded mb-2" />
        <div className="h-4 w-32 shimmer rounded" />
      </div>
    );
  }

  const today = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  // 진행 상태 계산
  const isUpcoming = isBefore(today, start);
  const isOngoing = isWithinInterval(today, { start, end });
  const isCompleted = isAfter(today, end);

  // 일수 계산
  const totalDays = differenceInDays(end, start) + 1;
  const elapsedDays = isOngoing
    ? differenceInDays(today, start) + 1
    : isCompleted
      ? totalDays
      : 0;
  const remainingDays = isOngoing ? totalDays - elapsedDays : isUpcoming ? totalDays : 0;
  const progressPercent = Math.round((elapsedDays / totalDays) * 100);

  // 상태별 스타일
  const statusConfig = {
    upcoming: {
      label: '시작 예정',
      icon: Timer,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      progressColor: 'bg-amber-400',
    },
    ongoing: {
      label: '진행 중',
      icon: Clock,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      progressColor: 'bg-emerald-500',
    },
    completed: {
      label: '종료',
      icon: CheckCircle2,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      borderColor: 'border-slate-200',
      progressColor: 'bg-slate-400',
    },
  };

  const status = isUpcoming ? 'upcoming' : isOngoing ? 'ongoing' : 'completed';
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={`rounded-xl p-5 shadow-sm border ${config.bgColor} ${config.borderColor} mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 왼쪽: 날짜 정보 */}
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg bg-white/80 ${config.textColor}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{cohortName} 일정</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {format(start, 'yyyy년 M월 d일 (EEE)', { locale: ko })} ~ {format(end, 'M월 d일 (EEE)', { locale: ko })}
              <span className="text-gray-400 ml-2">· 총 {totalDays}일</span>
            </p>
          </div>
        </div>

        {/* 오른쪽: 진행 상황 */}
        <div className="flex items-center gap-4 sm:gap-6">
          {isOngoing && (
            <>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">Day {elapsedDays}</p>
                <p className="text-xs text-gray-500">{remainingDays}일 남음</p>
              </div>
              <div className="hidden sm:block w-px h-10 bg-gray-200" />
            </>
          )}

          {/* 진행률 바 */}
          <div className="flex-1 sm:w-32 min-w-[120px]">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{elapsedDays}일 경과</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.progressColor} rounded-full transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
