'use client';

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
      <div className="border rounded-lg p-6 bg-white">
        <div className="h-5 w-24 shimmer rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 shimmer rounded" />
          <div className="h-12 shimmer rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h3 className="text-sm font-medium text-gray-600 mb-4">리뷰 품질</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">평균 리뷰 길이</span>
          <span className="text-lg font-semibold">{data.averageReviewLength}자</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">평균 가치관 답변 길이</span>
          <span className="text-lg font-semibold">{data.averageDailyAnswerLength}자</span>
        </div>
      </div>
    </div>
  );
}
