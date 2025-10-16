'use client';

import { FileText, Image, Sparkles } from 'lucide-react';

interface ReviewQualityData {
  averageReviewLength: number;
  longReviewPercentage: number;
  coverImagePercentage: number;
}

interface ReviewQualityPanelProps {
  data: ReviewQualityData;
  isLoading?: boolean;
}

export default function ReviewQualityPanel({ data, isLoading }: ReviewQualityPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="space-y-4">
          <div className="h-20 shimmer rounded" />
          <div className="h-20 shimmer rounded" />
          <div className="h-20 shimmer rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        리뷰 품질 분석
      </h3>

      <div className="space-y-4">
        {/* 평균 리뷰 길이 */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">평균 리뷰 길이</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{data.averageReviewLength}자</p>
            </div>
          </div>
        </div>

        {/* 긴 리뷰 비율 */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium">긴 리뷰 비율 (200자 이상)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-green-900">{data.longReviewPercentage}%</p>
                {data.longReviewPercentage >= 50 && (
                  <span className="text-xs text-green-700 font-semibold">우수 ✨</span>
                )}
              </div>
              <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${data.longReviewPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 책 표지 첨부율 */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center">
              <Image className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-purple-800 font-medium">책 표지 첨부율</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-purple-900">{data.coverImagePercentage}%</p>
                {data.coverImagePercentage >= 90 && (
                  <span className="text-xs text-purple-700 font-semibold">훌륭! 🎉</span>
                )}
              </div>
              <div className="mt-2 h-2 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${data.coverImagePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 인사이트 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-600">
          💡 {data.longReviewPercentage >= 50 ? '참가자들이 깊이 있는 리뷰를 작성하고 있습니다!' : '더 자세한 리뷰 작성을 독려해보세요.'}
        </p>
      </div>
    </div>
  );
}
