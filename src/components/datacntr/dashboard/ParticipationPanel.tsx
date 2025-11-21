'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface ParticipationData {
  totalSubmissions: number;
  totalActiveParticipants: number;
  dailyAverage: number;
  activeDays: number;
}

interface ParticipationPanelProps {
  data: ParticipationData;
  isLoading?: boolean;
}

export default function ParticipationPanel({ data, isLoading }: ParticipationPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const participationRate = data.totalActiveParticipants > 0
    ? Number((data.totalSubmissions / data.totalActiveParticipants).toFixed(1))
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          참여 지표
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">활성 참가자</span>
          <span className="text-lg font-bold">{data.totalActiveParticipants}명</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">총 인증 수</span>
          <span className="text-lg font-bold">{data.totalSubmissions}건</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">일일 평균</span>
          <span className="text-lg font-bold">{data.dailyAverage}건</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">1인당 인증수</span>
          <span className="text-lg font-bold">{participationRate}건</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">활동 일수</span>
          <span className="text-lg font-bold">{data.activeDays}일</span>
        </div>
      </CardContent>
    </Card>
  );
}
