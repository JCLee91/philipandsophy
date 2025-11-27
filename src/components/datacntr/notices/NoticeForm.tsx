'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import type { Cohort } from '@/types/database';

export interface NoticeFormData {
  cohortId: string;
  title: string;
  content: string;
  isScheduled: boolean;
  scheduledAt: string;
  imageFile: File | null;
  imagePreview: string;
  existingImageUrl: string;
  templateImageUrl: string;
}

export interface NoticeFormProps {
  /** 모드: create 또는 edit */
  mode: 'create' | 'edit';
  /** 수정 모드일 때 현재 상태 */
  currentStatus?: 'draft' | 'published' | 'scheduled';
  /** 초기 데이터 */
  initialData?: Partial<NoticeFormData>;
  /** 폼 제출 핸들러 */
  onSubmit: (data: NoticeFormData, isDraft: boolean) => Promise<void>;
  /** 취소 핸들러 */
  onCancel?: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

export default function NoticeForm({
  mode,
  currentStatus = 'published',
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: NoticeFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  // 코호트 목록
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);

  // 폼 상태
  const [selectedCohortId, setSelectedCohortId] = useState(initialData?.cohortId || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isScheduled, setIsScheduled] = useState(initialData?.isScheduled || false);
  const [scheduledAt, setScheduledAt] = useState(initialData?.scheduledAt || '');

  // 이미지 상태
  const [imageFile, setImageFile] = useState<File | null>(initialData?.imageFile || null);
  const [imagePreview, setImagePreview] = useState(initialData?.imagePreview || '');
  const [existingImageUrl, setExistingImageUrl] = useState(initialData?.existingImageUrl || '');
  const [templateImageUrl, setTemplateImageUrl] = useState(initialData?.templateImageUrl || '');

  // 제출 상태
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // 초기 데이터 변경 시 상태 업데이트
  useEffect(() => {
    if (initialData) {
      if (initialData.cohortId !== undefined) setSelectedCohortId(initialData.cohortId);
      if (initialData.title !== undefined) setTitle(initialData.title);
      if (initialData.content !== undefined) setContent(initialData.content);
      if (initialData.isScheduled !== undefined) setIsScheduled(initialData.isScheduled);
      if (initialData.scheduledAt !== undefined) setScheduledAt(initialData.scheduledAt);
      if (initialData.imagePreview !== undefined) setImagePreview(initialData.imagePreview);
      if (initialData.existingImageUrl !== undefined) setExistingImageUrl(initialData.existingImageUrl);
      if (initialData.templateImageUrl !== undefined) setTemplateImageUrl(initialData.templateImageUrl);
    }
  }, [initialData]);

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

        if (response.ok) {
          const data = await response.json();
          setCohorts(data);
        }
      } catch (error) {
        logger.error('Failed to fetch cohorts:', error);
      } finally {
        setLoadingCohorts(false);
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
    setTemplateImageUrl('');
    setExistingImageUrl('');

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
    setExistingImageUrl('');
    setTemplateImageUrl('');
  };

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    if (!selectedCohortId) {
      alert('기수를 선택해주세요.');
      return false;
    }

    if (!content.trim()) {
      alert('공지 내용을 입력해주세요.');
      return false;
    }

    if (isScheduled && !scheduledAt) {
      alert('예약 발행 시간을 설정해주세요.');
      return false;
    }

    return true;
  };

  // 폼 데이터 수집
  const getFormData = (): NoticeFormData => ({
    cohortId: selectedCohortId,
    title,
    content,
    isScheduled,
    scheduledAt,
    imageFile,
    imagePreview,
    existingImageUrl,
    templateImageUrl,
  });

  // 제출 핸들러
  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();

    if (!validateForm()) return;

    // 발행으로 변경 시 확인 (edit 모드에서 draft → published)
    if (mode === 'edit' && currentStatus === 'draft' && !isDraft && !isScheduled) {
      const confirmed = confirm('임시저장된 공지를 발행하시겠습니까?\n\n발행 시 모든 유저에게 푸시 알림이 전송됩니다.');
      if (!confirmed) return;
    }

    if (isDraft) {
      setIsDrafting(true);
    } else {
      setIsPublishing(true);
    }

    try {
      await onSubmit(getFormData(), isDraft);
    } finally {
      setIsDrafting(false);
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const isSubmitting = isDrafting || isPublishing;
  const showDraftButton = mode === 'create' ? !isScheduled : (currentStatus === 'draft' && !isScheduled);

  if (isLoading || loadingCohorts) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          뒤로 가기
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {mode === 'create' ? '공지사항 작성' : '공지사항 수정'}
        </h1>
        <p className="text-gray-600 mt-2">
          {mode === 'create'
            ? '참여자들에게 공지사항을 전달합니다.'
            : currentStatus === 'draft'
              ? '임시저장된 공지를 수정하고 발행할 수 있습니다.'
              : '발행된 공지를 수정합니다.'}
        </p>
      </div>

      {/* 공지 폼 */}
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
                    // 기본값: 현재 시간 + 1시간
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
        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-4 sm:static sm:border-t-0 sm:mx-0 sm:px-0 sm:py-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* 취소 버튼 */}
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto order-last sm:order-first px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>

            {/* 오른쪽 버튼 그룹 */}
            <div className="flex items-center gap-3">
              {showDraftButton && (
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
                className={`flex-1 sm:flex-none px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isScheduled ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isScheduled
                      ? mode === 'edit'
                        ? '예약 중...'
                        : '예약 중...'
                      : mode === 'edit'
                        ? '수정 중...'
                        : '작성 중...'}
                  </>
                ) : isScheduled ? (
                  mode === 'edit' ? (
                    '예약 수정'
                  ) : (
                    '예약하기'
                  )
                ) : mode === 'edit' ? (
                  '수정 완료'
                ) : (
                  '발행하기'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
