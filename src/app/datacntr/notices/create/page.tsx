'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import { logger } from '@/lib/logger';
import type { Cohort } from '@/types/database';

export const dynamic = 'force-dynamic';

export default function NoticeCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [templateImageUrl, setTemplateImageUrl] = useState<string>(''); // ✅ 템플릿에서 가져온 이미지 URL
  const [isDrafting, setIsDrafting] = useState(false); // 임시저장 로딩
  const [isPublishing, setIsPublishing] = useState(false); // 발행 로딩
  const [isLoading, setIsLoading] = useState(true);

  // URL에서 cohortId 가져오기
  useEffect(() => {
    const cohortIdFromUrl = searchParams.get('cohortId');
    if (cohortIdFromUrl) {
      setSelectedCohortId(cohortIdFromUrl);
    }
  }, [searchParams]);

  // ✅ templateId가 있으면 템플릿 데이터 로드
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (!templateId || !user) return;

    const fetchTemplate = async () => {
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
        setContent(template.content);
        if (template.imageUrl) {
          setImagePreview(template.imageUrl);
          setTemplateImageUrl(template.imageUrl); // ✅ 템플릿 이미지 URL 저장
        }
      } catch (error) {
        logger.error('템플릿 로드 실패:', error);
        alert('템플릿을 불러오는데 실패했습니다.');
      }
    };

    fetchTemplate();
  }, [searchParams, user]);

  // 코호트 목록 조회
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

        if (!response.ok) {
          throw new Error('코호트 조회 실패');
        }

        const data = await response.json();
        setCohorts(data);
      } catch (error) {

        alert('코호트 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [user]);

  // 이미지 파일 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setImageFile(file);
    setTemplateImageUrl(''); // ✅ 새 이미지 선택 시 템플릿 이미지 URL 초기화

    // 미리보기 생성
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
    setTemplateImageUrl(''); // ✅ 템플릿 이미지 URL도 제거
  };

  // 공지 작성/임시저장 제출
  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();

    if (!selectedCohortId) {
      alert('기수를 선택해주세요.');
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

    // Note: The original instruction included a check for `currentStatus` which is not defined in this component.
    // As this is a create page, `currentStatus` is not applicable.
    // If this component were for editing, `currentStatus` would need to be passed as a prop or fetched.

    // 임시저장/발행에 따라 다른 로딩 상태 사용
    if (isDraft) {
      setIsDrafting(true);
    } else {
      setIsPublishing(true);
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

      // ✅ 새 이미지 파일이 있으면 업로드
      if (imageFile) {
        formData.append('image', imageFile);
      }
      // ✅ 템플릿 이미지 URL이 있으면 전달 (새 이미지가 없을 때만)
      else if (templateImageUrl) {
        formData.append('templateImageUrl', templateImageUrl);
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
      } else if (isScheduled) {
        alert('공지가 예약되었습니다.');
      } else {
        alert('공지가 발행되었습니다.');
      }
      router.push('/datacntr/notices');
    } catch (error) {

      alert(error instanceof Error ? error.message : '공지 작성 중 오류가 발생했습니다.');
    } finally {
      // 각각의 로딩 상태 해제
      if (isDraft) {
        setIsDrafting(false);
      } else {
        setIsPublishing(false);
      }
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

  const isSubmitting = isDrafting || isPublishing;

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
        <h1 className="text-3xl font-bold text-gray-900">공지사항 작성</h1>
        <p className="text-gray-600 mt-2">참여자들에게 공지사항을 전달합니다.</p>
      </div>

      {/* 공지 작성 폼 */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* 기수 선택 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            기수 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">기수를 선택하세요</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
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
            ℹ️ 채팅방에는 표시되지 않으며, 푸시 알림과 관리자 목록에서만 확인 가능합니다.
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
          <p className="text-sm text-gray-500 mt-2">
            현재 {content.length}자
          </p>
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
                <p className="text-sm text-gray-600 font-medium">
                  클릭하여 이미지 업로드
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, WEBP (최대 5MB)
                </p>
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
            <label className="text-sm font-medium text-gray-900">
              예약 발행 설정
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isScheduled"
                checked={isScheduled}
                onChange={(e) => {
                  setIsScheduled(e.target.checked);
                  if (e.target.checked && !scheduledAt) {
                    // 기본값: 현재 시간 + 1시간 (ISO String slice for input)
                    const nextHour = new Date();
                    nextHour.setHours(nextHour.getHours() + 1);
                    nextHour.setMinutes(0);
                    // 로컬 시간 포맷팅 (YYYY-MM-DDTHH:mm)
                    const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
              <label className="block text-sm text-gray-600 mb-1">
                발행 예정 시간
              </label>
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
        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-4 sm:static sm:border-t-0 sm:mx-0 sm:px-0 sm:py-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* 취소 버튼 */}
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto order-last sm:order-first px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>

            {/* 오른쪽 버튼 그룹 */}
            <div className="flex items-center gap-3">
              {!isScheduled && ( // Only show "임시저장" button if not scheduled
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDrafting ? (
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
                className={`flex-1 sm:flex-none px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isScheduled ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isPublishing ? ( // Use isPublishing for the main submit button
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isScheduled ? '예약 중...' : '작성 중...'}
                  </>
                ) : (
                  isScheduled ? '예약하기' : '발행하기'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
