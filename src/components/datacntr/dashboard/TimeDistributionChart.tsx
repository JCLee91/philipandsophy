'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface TimeDistributionData {
  timeRange: string;
  count: number;
  percentage: number;
}

interface TimeDistributionChartProps {
  data: TimeDistributionData[];
  isLoading?: boolean;
}

export default function TimeDistributionChart({ data, isLoading }: TimeDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <div className="h-5 w-32 shimmer rounded mb-4" />
        <div className="h-[200px] shimmer rounded" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <p className="text-center text-gray-500 text-sm py-8">인증 데이터가 없습니다</p>
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
    <div className="border rounded-lg p-6 bg-white">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-600">시간대별 인증</h3>
        {peakTime && (
          <p className="text-xs text-gray-500 mt-1">
            피크: {peakTime.timeRange}시 ({peakTime.percentage}%)
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sortedData}>
          <XAxis
            dataKey="timeRange"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Bar dataKey="percentage" fill="#000000" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
