'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DailyActivity } from '@/types/datacntr';

type DateLike =
  | string
  | Date
  | { toDate?: () => Date; _seconds?: number; seconds?: number }
  | null
  | undefined;

interface ActivityChartProps {
  data: DailyActivity[];
  isLoading?: boolean;
  cohortName?: string; // 기수 이름 (예: '1기')
  cohortStartDate?: DateLike; // 시작일 (ISO 8601)
  cohortEndDate?: DateLike; // 종료일 (ISO 8601)
}

function coerceDate(value: DateLike): Date | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
  }

  if (typeof value._seconds === 'number') {
    const parsed = new Date(value._seconds * 1000);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value.seconds === 'number') {
    const parsed = new Date(value.seconds * 1000);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDateLabel(value: DateLike): string {
  const parsed = coerceDate(value);
  return parsed ? format(parsed, 'M/d', { locale: ko }) : '-';
}

export default function ActivityChart({
  data,
  isLoading,
  cohortName,
  cohortStartDate,
  cohortEndDate,
}: ActivityChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="h-[300px] shimmer rounded" />
      </div>
    );
  }

  // 날짜 포맷팅
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: formatDateLabel(item.date),
  }));

  // 차트 제목 생성
  let chartTitle = '일별 활동 추이';
  if (cohortName && cohortStartDate && cohortEndDate) {
    const startFormatted = formatDateLabel(cohortStartDate);
    const endFormatted = formatDateLabel(cohortEndDate);
    chartTitle = `${cohortName} 일별 활동 추이 (${startFormatted} ~ ${endFormatted})`;
  } else if (data.length > 0) {
    // 전체 기수 또는 기수 정보 없을 때
    const firstDate = formatDateLabel(data[0].date);
    const lastDate = formatDateLabel(data[data.length - 1].date);
    chartTitle = `전체 기수 일별 활동 추이 (${firstDate} ~ ${lastDate})`;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{chartTitle}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateLabel"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: '횟수/인원', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: '평균 글자수', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
          />
          {/* 왼쪽 Y축: 횟수/인원 */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pushEnabled"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="푸시 허용 인원"
            dot={{ fill: '#8b5cf6', r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="submissions"
            stroke="#3b82f6"
            strokeWidth={2}
            name="독서 인증"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="likes"
            stroke="#ec4899"
            strokeWidth={2}
            name="좋아요"
            dot={{ fill: '#ec4899', r: 4 }}
          />
          {/* 오른쪽 Y축: 평균 글자수 */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgReviewLength"
            stroke="#10b981"
            strokeWidth={2}
            name="리뷰 평균 글자수"
            dot={{ fill: '#10b981', r: 4 }}
            strokeDasharray="5 5"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgAnswerLength"
            stroke="#f59e0b"
            strokeWidth={2}
            name="가치관 답변 평균 글자수"
            dot={{ fill: '#f59e0b', r: 4 }}
            strokeDasharray="5 5"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
