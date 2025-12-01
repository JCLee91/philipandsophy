'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, X, ArrowLeft, Users } from 'lucide-react';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import type { Cohort } from '@/types/database';

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

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('published');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
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

        const notice: NoticeData = await response.json();

        setSelectedCohortId(notice.cohortId);
        setTitle(notice.title || '');
        setContent(notice.content);
        setStatus(notice.status || 'published');
        if (notice.imageUrl) {
          setExistingImageUrl(notice.imageUrl);
          setImagePreview(notice.imageUrl);
        }

        if (notice.status === 'scheduled' && notice.scheduledAt) {
          setIsScheduled(true);
          const date = new Date(notice.scheduledAt._seconds * 1000);
          const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setScheduledAt(localIso);
        }
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

  // 코호트 목록 조회 (선택된 코호트 이름 표시용)
  useEffect(() => {
    if (!user) return;

    const fetchCohorts = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCohorts(data);
        }
      } catch (error) {
        logger.error('Failed to fetch cohorts:', error);
      }
    };

    fetchCohorts();
  }, [user]);

  // 이미지 파일 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl('');
  };

  // 공지 수정/발행 제출
  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();

    if (!selectedCohortId) {
      alert('기수 정보를 찾을 수 없습니다.');
      return;
    }

    if (!content.trim()) {
      alert('공지 내용을 입력해주세요.');
      return;
    }

    if (isScheduled && !scheduledAt) {
      alert('예약 발행 시간을 설정해주세요.');
      return;
    }

    if (!user) return;

    // 발행으로 변경 시 확인
    if (status === 'draft' && !isDraft && !isScheduled) {
      const confirmed = confirm(
        '임시저장된 공지를 발행하시겠습니까?\n\n발행 시 모든 유저에게 푸시 알림이 전송됩니다.'
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    if (isDraft) {
      setIsDrafting(true);
    }

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('cohortId', selectedCohortId);
      if (title.trim()) {
        formData.append('title', title.trim());
      }
      formData.append('content', content.trim());

      if (isScheduled && !isDraft) {
        formData.append('status', 'scheduled');
        formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      } else {
        formData.append('status', isDraft ? 'draft' : 'published');
      }

      if (imageFile) {
        formData.append('image', imageFile);
      } else if (existingImageUrl) {
        formData.append('existingImageUrl', existingImageUrl);
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
      } else if (isScheduled) {
        alert('공지가 예약되었습니다.');
      } else {
        alert('공지가 수정되었습니다.');
      }
      router.push('/datacntr/notices');
    } catch (error) {
      logger.error('Failed to submit notice:', error);
      alert(error instanceof Error ? error.message : '공지 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsDrafting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          뒤로 가기
        </button>
        <h1 className="text-3xl font-bold text-gray-900">공지사항 수정</h1>
        <p className="text-gray-600 mt-2">
          {status === 'draft'
            ? '임시저장된 공지를 수정하고 발행할 수 있습니다.'
            : '발행된 공지를 수정합니다.'}
        </p>
      </div>

      {/* 공지 수정 폼 */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* 기수 표시 (고정, 변경 불가) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">수정 대상 기수</p>
              <p className="text-lg font-bold text-gray-900">
                {selectedCohort?.name || selectedCohortId}
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            * 공지의 기수는 변경할 수 없습니다. 다른 기수에 공지하려면 새로 작성해주세요.
          </p>
        </div>

        {/* 푸시 알림 제목 (선택) */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            푸시 알림 제목 (선택)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="푸시 알림에 표시될 제목을 입력하세요 (미입력 시 기본값 사용)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-2">
            * 채팅방에는 표시되지 않으며, 푸시 알림과 관리자 목록에서만 확인 가능합니다.
          </p>
        </div>

        {/* 공지 내용 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            공지 내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요..."
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
          <p className="text-sm text-gray-500 mt-2">현재 {content.length}자</p>
        </div>

        {/* 이미지 업로드 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            이미지 첨부 (선택)
          </label>

          {!imagePreview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center justify-center py-6">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">클릭하여 이미지 업로드</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (최대 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <Image
                src={imagePreview}
                alt="미리보기"
                width={600}
                height={400}
                className="rounded-lg border border-gray-200 w-full h-auto"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* 예약 발행 설정 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-900">예약 발행 설정</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isScheduled"
                checked={isScheduled}
                onChange={(e) => {
                  setIsScheduled(e.target.checked);
                  if (e.target.checked && !scheduledAt) {
                    const nextHour = new Date();
                    nextHour.setHours(nextHour.getHours() + 1);
                    nextHour.setMinutes(0);
                    const localIso = new Date(
                      nextHour.getTime() - nextHour.getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 16);
                    setScheduledAt(localIso);
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isScheduled" className="ml-2 text-sm text-gray-700">
                나중에 발행하기
              </label>
            </div>
          </div>

          {isScheduled && (
            <div className="mt-2">
              <label className="block text-sm text-gray-600 mb-1">발행 예정 시간</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-2">
                * 설정한 시간에 자동으로 발행되고 푸시 알림이 전송됩니다. (30분 단위 체크)
              </p>
            </div>
          )}
        </div>

        {/* 제출 버튼 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <div className="flex items-center gap-3">
            {status === 'draft' && !isScheduled && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && isDrafting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '임시저장'
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                isScheduled ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting && !isDrafting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isScheduled ? '예약 중...' : '수정 중...'}
                </>
              ) : isScheduled ? (
                '예약 수정'
              ) : (
                '수정 완료'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
