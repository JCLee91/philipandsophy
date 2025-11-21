'use client';

import { useState } from 'react';
import { Search, X, BookOpen, Trophy, TrendingUp, Book } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface BookWithCount {
  title: string;
  author?: string;
  count: number;
  participants: string[];
}

interface AllBooksPanelProps {
  data: BookWithCount[];
  isLoading?: boolean;
}

export default function AllBooksPanel({ data, isLoading }: AllBooksPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredBooks = data.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 참가자별 읽은 책 수 집계
  const participantStats = new Map<string, number>();
  data.forEach((book) => {
    book.participants.forEach((name) => {
      participantStats.set(name, (participantStats.get(name) || 0) + 1);
    });
  });

  // 상위 10명 정렬
  const topReaders = Array.from(participantStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
      {/* 책 목록 (왼쪽 2칸) */}
      <Card className="lg:col-span-2 flex flex-col h-[800px]">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              인증된 책 목록
            </CardTitle>
            <Badge variant="secondary" className="font-normal">
              총 {data.length}권
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* 검색 */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="책 제목 또는 저자로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 책 목록 */}
          <ScrollArea className="flex-1 -mr-4 pr-4">
            <div className="space-y-1">
              {filteredBooks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Book className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">
                    {searchQuery ? '검색 결과가 없습니다' : '인증된 책이 없습니다'}
                  </p>
                </div>
              )}

              {filteredBooks.map((book, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 px-3 hover:bg-muted/50 rounded-md transition-colors group"
                >
                  {/* 책 정보 */}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="text-xs text-muted-foreground truncate">
                        {book.author}
                      </p>
                    )}
                  </div>

                  {/* 인증 횟수 */}
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="font-normal bg-background">
                      {book.count}회
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* 통계 요약 */}
          {filteredBooks.length > 0 && (
            <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
              <span>검색된 책 {filteredBooks.length}권</span>
              <span>
                총 {filteredBooks.reduce((sum, book) => sum + book.count, 0)}회 인증
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통계 (오른쪽 1칸) */}
      <div className="flex flex-col gap-6 h-[800px]">
        {/* 책 종류 통계 */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              책 통계
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">총 책 종류</span>
              <span className="text-lg font-bold">{data.length}권</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">총 인증 수</span>
              <span className="text-lg font-bold">
                {data.reduce((sum, book) => sum + book.count, 0)}회
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">평균 인증</span>
              <span className="text-lg font-bold">
                {data.length > 0
                  ? Math.round(data.reduce((sum, book) => sum + book.count, 0) / data.length)
                  : 0}
                회
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">참여 인원</span>
              <span className="text-lg font-bold">{participantStats.size}명</span>
            </div>
          </CardContent>
        </Card>

        {/* 독서왕 Top 10 */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              독서왕 TOP 10
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full -mr-4 pr-4">
              <div className="space-y-1">
                {topReaders.length === 0 && (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    데이터가 없습니다
                  </div>
                )}
                {topReaders.map(([name, count], index) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`
                        flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-muted text-muted-foreground'}
                      `}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{count}권</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
