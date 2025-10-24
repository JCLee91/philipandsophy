'use client';

import { BookOpen, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          책 다양성 지표
        </CardTitle>
      </CardHeader>
      <CardContent>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold">{data.uniqueBookCount}</p>
          <p className="text-xs text-muted-foreground mt-1">총 책 종류</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{data.averageDuplication}회</p>
          <p className="text-xs text-muted-foreground mt-1">평균 중복도</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{data.totalSubmissions}</p>
          <p className="text-xs text-muted-foreground mt-1">전체 인증</p>
        </div>
      </div>

      {/* 인기 책 Top 5 */}
      {data.topBooks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1 text-muted-foreground">
            <Award className="h-4 w-4" />
            인기 책 Top 5
          </h4>
          <div className="space-y-2">
            {data.topBooks.map((book, index) => {
              const percentage = data.totalSubmissions > 0
                ? Math.round((book.count / data.totalSubmissions) * 100)
                : 0;

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold">{book.count}명</p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.topBooks.length === 0 && (
        <p className="text-center text-muted-foreground text-sm">인증 데이터가 없습니다</p>
      )}
      </CardContent>
    </Card>
  );
}
