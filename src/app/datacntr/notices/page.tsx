'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bell, Pin, Calendar, User } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import type { Notice } from '@/types/database';

interface NoticeWithCohort extends Notice {
  cohortName: string;
}

export default function NoticesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [notices, setNotices] = useState<NoticeWithCohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 공지사항 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchNotices = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/notices', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('공지사항 조회 실패');
        }

        const data = await response.json();
        setNotices(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">공지사항 분석</h1>
        <p className="text-gray-600 mt-2">전체 공지사항 내역</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 공지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{notices.length}개</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">고정 공지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notices.filter((n) => n.isPinned).length}개
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <Pin className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이미지 첨부</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notices.filter((n) => n.imageUrl).length}개
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 공지사항 리스트 */}
      <div className="space-y-4">
        {notices.map((notice) => {
          return (
            <div
              key={notice.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-900">{notice.author}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-sm text-gray-500">{notice.cohortName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {notice.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                      <Pin className="h-3 w-3" />
                      고정
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTimestampKST(notice.createdAt, 'M월 d일 HH:mm')}
                  </span>
                </div>
              </div>

              {/* 내용 */}
              <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>

              {/* 이미지 */}
              {notice.imageUrl && (
                <div className="mt-4">
                  <img
                    src={notice.imageUrl}
                    alt="공지 이미지"
                    className="max-w-md rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notices.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">등록된 공지사항이 없습니다</p>
        </div>
      )}
    </div>
  );
}
