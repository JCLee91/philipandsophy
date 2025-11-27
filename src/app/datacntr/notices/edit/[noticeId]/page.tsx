'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import NoticeForm, { NoticeFormData } from '@/components/datacntr/notices/NoticeForm';

export const dynamic = 'force-dynamic';

interface NoticeData {
  id: string;
  cohortId: string;
  title?: string;
  content: string;
  status?: 'draft' | 'published' | 'scheduled';
  scheduledAt?: { _seconds: number; _nanoseconds: number };
  imageUrl?: string;
  author: string;
}

export default function NoticeEditPage() {
  const router = useRouter();
  const params = useParams();
  const noticeId = params.noticeId as string;
  const { user, isLoading: authLoading } = useAuth();

  // 공지 데이터 상태
  const [notice, setNotice] = useState<NoticeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 공지 데이터 로드
  useEffect(() => {
    if (!user || !noticeId) return;

    const fetchNotice = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/datacntr/notices/${noticeId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('공지 조회 실패');
        }

        const data: NoticeData = await response.json();
        setNotice(data);
      } catch (error) {
        logger.error('Failed to fetch notice:', error);
        alert('공지를 불러오는데 실패했습니다.');
        router.push('/datacntr/notices');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotice();
  }, [user, noticeId, router]);

  // 초기 데이터 변환
  const getInitialData = (): Partial<NoticeFormData> | undefined => {
    if (!notice) return undefined;

    let scheduledAtStr = '';
    if (notice.status === 'scheduled' && notice.scheduledAt) {
      const date = new Date(notice.scheduledAt._seconds * 1000);
      scheduledAtStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }

    return {
      cohortId: notice.cohortId,
      title: notice.title || '',
      content: notice.content,
      isScheduled: notice.status === 'scheduled',
      scheduledAt: scheduledAtStr,
      imagePreview: notice.imageUrl || '',
      existingImageUrl: notice.imageUrl || '',
    };
  };

  // 폼 제출 핸들러
  const handleSubmit = async (data: NoticeFormData, isDraft: boolean) => {
    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('cohortId', data.cohortId);
      if (data.title.trim()) {
        formData.append('title', data.title.trim());
      }
      formData.append('content', data.content.trim());

      if (data.isScheduled && !isDraft) {
        formData.append('status', 'scheduled');
        formData.append('scheduledAt', new Date(data.scheduledAt).toISOString());
      } else {
        formData.append('status', isDraft ? 'draft' : 'published');
      }

      if (data.imageFile) {
        formData.append('image', data.imageFile);
      } else if (data.existingImageUrl) {
        formData.append('existingImageUrl', data.existingImageUrl);
      }

      const response = await fetch(`/api/datacntr/notices/${noticeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '공지 수정 실패');
      }

      if (isDraft) {
        alert('공지가 임시저장되었습니다.');
      } else if (data.isScheduled) {
        alert('공지가 예약되었습니다.');
      } else {
        alert('공지가 수정되었습니다.');
      }
      router.push('/datacntr/notices');
    } catch (error) {
      logger.error('Failed to submit notice:', error);
      alert(error instanceof Error ? error.message : '공지 수정 중 오류가 발생했습니다.');
      throw error;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !notice) return null;

  return (
    <NoticeForm
      mode="edit"
      currentStatus={notice.status || 'published'}
      initialData={getInitialData()}
      onSubmit={handleSubmit}
    />
  );
}
