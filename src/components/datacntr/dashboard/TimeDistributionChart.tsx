'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

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
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">인증 데이터가 없습니다</p>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            시간대별 인증
          </CardTitle>
          {peakTime && (
            <span className="text-xs text-muted-foreground">
              피크: {peakTime.timeRange}시 ({peakTime.percentage}%)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
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
      </CardContent>
    </Card>
  );
}
