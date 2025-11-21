'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface ReviewQualityData {
  averageReviewLength: number;
  averageDailyAnswerLength: number;
}

interface ReviewQualityPanelProps {
  data: ReviewQualityData;
  isLoading?: boolean;
}

export default function ReviewQualityPanel({ data, isLoading }: ReviewQualityPanelProps) {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Star className="h-4 w-4" />
          리뷰 품질
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">평균 리뷰 길이</span>
          <span className="text-lg font-bold">{data.averageReviewLength}자</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">평균 가치관 답변 길이</span>
          <span className="text-lg font-bold">{data.averageDailyAnswerLength}자</span>
        </div>
      </CardContent>
    </Card>
  );
}
