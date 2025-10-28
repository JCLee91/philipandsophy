'use client';

import { FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <CardHeader>
          <div className="h-6 w-48 shimmer rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 shimmer rounded" />
          <div className="h-20 shimmer rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          리뷰 품질 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 평균 리뷰 길이 */}
        <div className="rounded-lg p-4 border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">평균 리뷰 길이</p>
                <p className="text-2xl font-bold mt-1">{data.averageReviewLength}자</p>
              </div>
            </div>
          </div>
        </div>

        {/* 평균 가치관 답변 길이 */}
        <div className="rounded-lg p-4 border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">평균 가치관 답변 길이</p>
                <p className="text-2xl font-bold mt-1">{data.averageDailyAnswerLength}자</p>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
