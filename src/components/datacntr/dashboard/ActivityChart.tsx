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
      <h3 className="text-lg font-bold text-gray-900 mb-4">활동 추이 (최근 7일)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateLabel"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
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
          <Line
            type="monotone"
            dataKey="submissions"
            stroke="#3b82f6"
            strokeWidth={2}
            name="독서 인증"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="newParticipants"
            stroke="#10b981"
            strokeWidth={2}
            name="신규 참가자"
            dot={{ fill: '#10b981', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="messages"
            stroke="#f59e0b"
            strokeWidth={2}
            name="메시지"
            dot={{ fill: '#f59e0b', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
