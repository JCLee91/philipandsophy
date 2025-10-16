'use client';

import { BookOpen, TrendingUp, Award } from 'lucide-react';

interface BookDiversityData {
  totalSubmissions: number;
  uniqueBookCount: number;
  averageDuplication: number;
  topBooks: Array<{
    title: string;
    count: number;
  }>;
}

interface BookDiversityPanelProps {
  data: BookDiversityData;
  isLoading?: boolean;
}

export default function BookDiversityPanel({ data, isLoading }: BookDiversityPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-600" />
        책 다양성 지표
      </h3>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{data.uniqueBookCount}</p>
          <p className="text-xs text-gray-600 mt-1">총 책 종류</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-600">{data.averageDuplication}회</p>
          <p className="text-xs text-gray-600 mt-1">평균 중복도</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{data.totalSubmissions}</p>
          <p className="text-xs text-gray-600 mt-1">전체 인증</p>
        </div>
      </div>

      {/* 인기 책 Top 5 */}
      {data.topBooks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Award className="h-4 w-4 text-yellow-500" />
            인기 책 Top 5
          </h4>
          <div className="space-y-2">
            {data.topBooks.map((book, index) => {
              const percentage = data.totalSubmissions > 0
                ? Math.round((book.count / data.totalSubmissions) * 100)
                : 0;

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                    <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">{book.count}명</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.topBooks.length === 0 && (
        <p className="text-center text-gray-500 text-sm">인증 데이터가 없습니다</p>
      )}
    </div>
  );
}
