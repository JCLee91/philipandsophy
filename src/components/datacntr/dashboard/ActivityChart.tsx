'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DailyActivity } from '@/types/datacntr';

interface ActivityChartProps {
  data: DailyActivity[];
  isLoading?: boolean;
}

export default function ActivityChart({ data, isLoading }: ActivityChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="h-[300px] shimmer rounded" />
      </div>
    );
  }

  // 날짜 포맷팅
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(parseISO(item.date), 'M/d', { locale: ko }),
  }));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">일별 활동 추이 (최근 7일)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={formattedData}>
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
