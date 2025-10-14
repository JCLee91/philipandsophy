'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TimeDistributionData {
  timeRange: string;
  count: number;
  percentage: number;
}

interface TimeDistributionChartProps {
  data: TimeDistributionData[];
  isLoading?: boolean;
}

const COLORS = {
  low: '#d1d5db',    // 회색 (0-15%)
  medium: '#60a5fa', // 파란색 (15-30%)
  high: '#3b82f6',   // 진한 파란색 (30%+)
};

export default function TimeDistributionChart({ data, isLoading }: TimeDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="h-[300px] shimmer rounded" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">인증 데이터가 없습니다</p>
      </div>
    );
  }

  // 시간대 정렬 (06-09시부터)
  const sortedData = [...data].sort((a, b) => {
    const order = ['06-09', '09-12', '12-15', '15-18', '18-21', '21-24', '00-06'];
    return order.indexOf(a.timeRange) - order.indexOf(b.timeRange);
  });

  // 가장 높은 비율 찾기
  const maxPercentage = Math.max(...sortedData.map((d) => d.percentage));
  const peakTime = sortedData.find((d) => d.percentage === maxPercentage);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">시간대별 인증 제출</h3>
        {peakTime && (
          <p className="text-sm text-gray-600 mt-1">
            📊 <span className="font-semibold">{peakTime.timeRange}시</span> 제출이 가장 많습니다 ({peakTime.percentage}%)
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="timeRange"
            tick={{ fontSize: 12 }}
            label={{ value: '시간대', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: '비율 (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${props.payload.count}회 (${value}%)`,
              '인증 횟수',
            ]}
          />
          <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
            {sortedData.map((entry, index) => {
              let color = COLORS.low;
              if (entry.percentage >= 30) color = COLORS.high;
              else if (entry.percentage >= 15) color = COLORS.medium;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.high }} />
          <span>높음 (30%+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.medium }} />
          <span>보통 (15-30%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.low }} />
          <span>낮음 (0-15%)</span>
        </div>
      </div>
    </div>
  );
}
