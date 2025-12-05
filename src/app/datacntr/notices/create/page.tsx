'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import { useDatacntrAuth, useNoticeForm } from '@/hooks/datacntr';
import { NoticeFormFields } from '@/components/datacntr/notices';

export const dynamic = 'force-dynamic';

function NoticeCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId') || undefined;
  const { isLoading: authLoading } = useDatacntrAuth();

  const {
    title,
    setTitle,
    content,
    setContent,
    imagePreview,
    handleImageChange,
    handleRemoveImage,
    isScheduled,
    handleScheduleToggle,
    scheduledDate,
    setScheduledDate,
    scheduledHour,
    setScheduledHour,
    scheduledMinute,
    setScheduledMinute,
    handleSubmit,
    isSubmitting,
    isDrafting,
    isLoading,
    needsCohortSelection,
    selectedCohort,
    selectedCohortId,
  } = useNoticeForm({ mode: 'create', templateId });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (needsCohortSelection) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            뒤로 가기
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Users className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            기수를 먼저 선택해주세요
          </h2>
          <p className="text-gray-600 mb-4">
            공지사항을 작성하려면 상단 헤더에서 기수를 선택해야 합니다.
          </p>
          <button
            type="button"
            onClick={() => router.push('/datacntr/notices')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            공지사항 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
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

      {/* Form */}
      <form onSubmit={(e) => handleSubmit(e, false)}>
        <NoticeFormFields
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          imagePreview={imagePreview}
          onImageChange={handleImageChange}
          onRemoveImage={handleRemoveImage}
          isScheduled={isScheduled}
          onScheduleToggle={handleScheduleToggle}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          scheduledHour={scheduledHour}
          setScheduledHour={setScheduledHour}
          scheduledMinute={scheduledMinute}
          setScheduledMinute={setScheduledMinute}
          selectedCohort={selectedCohort}
          cohortId={selectedCohortId}
          cohortLabel="작성 대상 기수"
          cohortHelpText="* 다른 기수에 공지를 작성하려면 상단 헤더에서 기수를 변경하세요."
        />

        {/* Submit buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-4 sm:static sm:border-t-0 sm:mx-0 sm:px-0 sm:py-0 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto order-last sm:order-first px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>

            <div className="flex items-center gap-3">
              {!isScheduled && (
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
                {isSubmitting && !isDrafting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isScheduled ? '예약 중...' : '작성 중...'}
                  </>
                ) : isScheduled ? (
                  '예약하기'
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

export default function NoticeCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <NoticeCreateContent />
    </Suspense>
  );
}
