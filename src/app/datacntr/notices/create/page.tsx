'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import NoticeForm, { NoticeFormData } from '@/components/datacntr/notices/NoticeForm';

export const dynamic = 'force-dynamic';

export default function NoticeCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // 템플릿 로드 상태
  const [templateData, setTemplateData] = useState<Partial<NoticeFormData>>({});
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // URL에서 cohortId 가져오기
  const cohortIdFromUrl = searchParams.get('cohortId');

  // 템플릿 데이터 로드
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (!templateId || !user) return;

    const fetchTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/datacntr/notice-templates/${templateId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('템플릿 조회 실패');
        }

        const template = await response.json();
        setTemplateData({
          content: template.content,
          imagePreview: template.imageUrl || '',
          templateImageUrl: template.imageUrl || '',
        });
      } catch (error) {
        logger.error('템플릿 로드 실패:', error);
        alert('템플릿을 불러오는데 실패했습니다.');
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchTemplate();
  }, [searchParams, user]);

  // 초기 데이터
  const initialData: Partial<NoticeFormData> = {
    cohortId: cohortIdFromUrl || '',
    ...templateData,
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

      // 새 이미지 파일이 있으면 업로드
      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }
      // 템플릿 이미지 URL이 있으면 전달 (새 이미지가 없을 때만)
      else if (data.templateImageUrl) {
        formData.append('templateImageUrl', data.templateImageUrl);
      }

      const response = await fetch('/api/datacntr/notices/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '공지 작성 실패');
      }

      if (isDraft) {
        alert('공지가 임시저장되었습니다.');
      } else if (data.isScheduled) {
        alert('공지가 예약되었습니다.');
      } else {
        alert('공지가 발행되었습니다.');
      }
      router.push('/datacntr/notices');
    } catch (error) {
      alert(error instanceof Error ? error.message : '공지 작성 중 오류가 발생했습니다.');
      throw error; // Re-throw to keep loading state until resolved
    }
  };

  if (authLoading || loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <NoticeForm
      mode="create"
      initialData={initialData}
      onSubmit={handleSubmit}
    />
  );
}
