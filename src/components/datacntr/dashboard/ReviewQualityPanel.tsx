'use client';

import { FileText, Image, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReviewQualityData {
  averageReviewLength: number;
  longReviewPercentage: number;
  dailyAnswerPercentage: number;
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

        {/* 긴 리뷰 비율 */}
        <div className="rounded-lg p-4 border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">긴 리뷰 비율 (200자 이상)</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold">{data.longReviewPercentage}%</p>
                  {data.longReviewPercentage >= 50 && (
                    <span className="text-xs text-muted-foreground font-medium">우수</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${data.longReviewPercentage}%` }}
            />
          </div>
        </div>

        {/* 가치관 답변 작성률 */}
        <div className="rounded-lg p-4 border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">가치관 답변 작성률</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold">{data.dailyAnswerPercentage}%</p>
                  {data.dailyAnswerPercentage >= 70 && (
                    <span className="text-xs text-muted-foreground font-medium">우수</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${data.dailyAnswerPercentage}%` }}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
