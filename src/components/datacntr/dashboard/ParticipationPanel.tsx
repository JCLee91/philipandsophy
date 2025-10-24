'use client';

import { Users, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <CardHeader>
          <div className="h-6 w-48 shimmer rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-16 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
        </CardContent>
      </Card>
    );
  }

  const participationRate = data.totalActiveParticipants > 0
    ? Number((data.totalSubmissions / data.totalActiveParticipants).toFixed(1))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          참여 지표
        </CardTitle>
      </CardHeader>
      <CardContent>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold">{data.totalActiveParticipants}</p>
          <p className="text-xs text-muted-foreground mt-1">활성 참가자</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{data.dailyAverage}</p>
          <p className="text-xs text-muted-foreground mt-1">일일 평균</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{participationRate}</p>
          <p className="text-xs text-muted-foreground mt-1">1인당 인증수</p>
        </div>
      </div>

      {/* 참여 상세 */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">활동 일수</span>
          </div>
          <span className="text-sm font-bold">{data.activeDays}일</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">총 인증 수</span>
          </div>
          <span className="text-sm font-bold">{data.totalSubmissions}건</span>
        </div>
      </div>

      </CardContent>
    </Card>
  );
}
