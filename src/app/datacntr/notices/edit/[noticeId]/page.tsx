'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useDatacntrAuth, useNoticeForm } from '@/hooks/datacntr';
import { NoticeFormFields } from '@/components/datacntr/notices';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ noticeId: string }>;
}

export default function NoticeEditPage({ params }: PageProps) {
  const { noticeId } = use(params);
  const router = useRouter();
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
    status,
    isLoading,
    selectedCohort,
    selectedCohortId,
  } = useNoticeForm({ mode: 'edit', noticeId });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
        <h1 className="text-3xl font-bold text-gray-900">공지사항 수정</h1>
        <p className="text-gray-600 mt-2">
          {status === 'draft'
            ? '임시저장된 공지를 수정하고 발행할 수 있습니다.'
            : '발행된 공지를 수정합니다.'}
        </p>
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
          cohortLabel="수정 대상 기수"
          cohortHelpText="* 공지의 기수는 변경할 수 없습니다. 다른 기수에 공지하려면 새로 작성해주세요."
        />

        {/* Submit buttons */}
        <div className="flex items-center justify-between mt-6">
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
