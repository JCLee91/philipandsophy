'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
        <div className="lg:col-span-2 border rounded-lg p-6 bg-white">
          <div className="h-5 w-32 shimmer rounded mb-4" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 shimmer rounded" />
            ))}
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-white">
          <div className="h-5 w-24 shimmer rounded mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 shimmer rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 책 목록 (왼쪽 2칸) */}
      <div className="lg:col-span-2 border rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">인증된 책 목록</h3>
          <span className="text-xs text-gray-500">총 {data.length}권</span>
        </div>

      <div>
        {/* 검색 */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="책 제목 또는 저자로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 책 목록 */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredBooks.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              {searchQuery ? '검색 결과가 없습니다' : '인증된 책이 없습니다'}
            </p>
          )}

          {filteredBooks.map((book, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded"
            >
              {/* 책 정보 */}
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium truncate">{book.title}</p>
                {book.author && (
                  <p className="text-xs text-gray-500 truncate">{book.author}</p>
                )}
              </div>

              {/* 인증 횟수 */}
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-semibold">{book.count}회</span>
              </div>
            </div>
          ))}
        </div>

        {/* 통계 요약 */}
        {filteredBooks.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
            <span>총 {filteredBooks.length}권</span>
            <span>
              {filteredBooks.reduce((sum, book) => sum + book.count, 0)}회 인증
            </span>
          </div>
        )}
      </div>
      </div>

      {/* 통계 (오른쪽 1칸) */}
      <div className="space-y-6">
        {/* 책 종류 통계 */}
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="text-sm font-medium text-gray-600 mb-4">책 통계</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">총 책 종류</span>
              <span className="text-lg font-semibold">{data.length}권</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">총 인증 수</span>
              <span className="text-lg font-semibold">
                {data.reduce((sum, book) => sum + book.count, 0)}회
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">평균 인증</span>
              <span className="text-lg font-semibold">
                {data.length > 0
                  ? Math.round(data.reduce((sum, book) => sum + book.count, 0) / data.length)
                  : 0}
                회
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">참여 인원</span>
              <span className="text-lg font-semibold">{participantStats.size}명</span>
            </div>
          </div>
        </div>

        {/* 독서왕 Top 10 */}
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="text-sm font-medium text-gray-600 mb-4">독서왕 TOP 10</h3>
          <div className="space-y-2">
            {topReaders.length === 0 && (
              <p className="text-center text-gray-500 text-xs py-4">데이터가 없습니다</p>
            )}
            {topReaders.map(([name, count], index) => (
              <div
                key={name}
                className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                  <span className="text-sm">{name}</span>
                </div>
                <span className="text-sm font-semibold">{count}권</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
