'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { saveDraft, createSubmission, updateParticipantBookInfo } from '@/lib/firebase';
import { getDailyQuestion } from '@/lib/firebase/daily-questions';
import { getSubmissionDate } from '@/lib/date-utils';
import { useSubmissionCommon } from '@/hooks/use-submission-common';
import SubmissionLayout from '@/components/submission/SubmissionLayout';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Textarea } from '@/components/ui/textarea';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { appRoutes } from '@/lib/navigation';
import { useDebounce } from 'react-use';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function Step3Content() {
  const {
    router,
    cohortId,
    existingSubmissionId,
    participant,
    sessionLoading,
    participantId,
    participationCode,
    submissionDate,
    mainPaddingBottom,
    footerPaddingBottom,
    toast,
    handleBack,
  } = useSubmissionCommon();

  const {
    imageStorageUrl,
    selectedBook,
    manualTitle,
    review,
    dailyAnswer: globalDailyAnswer,
    setDailyAnswer: setGlobalDailyAnswer,
    reset,
    isEBook,
  } = useSubmissionFlowStore();

  const [localDailyAnswer, setLocalDailyAnswer] = useState(globalDailyAnswer);
  const [dailyQuestion, setDailyQuestion] = useState<string | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const loadedExistingDailyAnswerRef = useRef(false);
  const loadedDraftRef = useRef(false);

  const bookTitle = selectedBook?.title || manualTitle;

  // Sync local state with global
  useEffect(() => {
    setLocalDailyAnswer(globalDailyAnswer);
  }, [globalDailyAnswer]);

  // Debounce auto-save
  useDebounce(
    async () => {
      if (localDailyAnswer === globalDailyAnswer) return;
      setGlobalDailyAnswer(localDailyAnswer);

      if (participantId && participationCode && localDailyAnswer.length > 5 && !isSubmitting) {
        await performAutoSave(localDailyAnswer);
      }
    },
    1000,
    [localDailyAnswer]
  );

  const performAutoSave = async (currentAnswer: string) => {
    if (!participantId || !participationCode) return;
    setIsAutoSaving(true);
    try {
      const draftData: any = {
        dailyAnswer: currentAnswer,
        dailyQuestion: dailyQuestion,
        isEBook,
      };
      if (cohortId) draftData.cohortId = cohortId;
      await saveDraft(participantId, participationCode, draftData, undefined, submissionDate || undefined);
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Auto-save failed', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Step 2 validation (제출 중에는 스킵 - reset() 후 race condition 방지)
  useEffect(() => {
    if (isSubmitting) return;

    const hasBook = selectedBook || manualTitle.trim();
    if (!hasBook || !review.trim() || review.length < SUBMISSION_VALIDATION.MIN_REVIEW_LENGTH) {
      toast({ title: '감상평을 먼저 작성해주세요', description: '2단계에서 책 정보와 감상평을 입력해주세요.', variant: 'destructive' });
      router.replace(`${appRoutes.submitStep2}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    }
  }, [selectedBook, manualTitle, review, cohortId, existingSubmissionId, router, toast, isSubmitting]);

  // 일일 질문 로드 (Firestore cohort별 daily_questions에서)
  useEffect(() => {
    if (!cohortId) return;

    const loadQuestion = async () => {
      setIsLoadingQuestion(true);
      try {
        const dateForQuestion = submissionDate || getSubmissionDate();
        const questionObj = await getDailyQuestion(cohortId, dateForQuestion);
        setDailyQuestion(questionObj?.question || '오늘 하루는 어떠셨나요?');
      } catch (error) {
        logger.error('[Step3] getDailyQuestion error:', error);
        setDailyQuestion('오늘 하루는 어떠셨나요?');
      } finally {
        setIsLoadingQuestion(false);
      }
    };

    loadQuestion();
  }, [cohortId, submissionDate]);

  // 임시저장 답변 로드 (새 제출 시)
  useEffect(() => {
    if (!participant || !cohortId || existingSubmissionId || loadedDraftRef.current) return;

    const loadDraft = async () => {
      try {
        const { getDraftSubmission } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participant.id, cohortId, submissionDate || undefined);

        if (draft?.dailyAnswer) {
          setGlobalDailyAnswer(draft.dailyAnswer);
          setLocalDailyAnswer(draft.dailyAnswer);
        }
        loadedDraftRef.current = true;
      } catch (error) {
        logger.error('[Step3] Draft load error:', error);
      }
    };

    loadDraft();
  }, [participant, cohortId, existingSubmissionId, submissionDate, setGlobalDailyAnswer]);

  // 기존 제출물 답변 로드 (수정 모드)
  useEffect(() => {
    if (!existingSubmissionId || loadedExistingDailyAnswerRef.current) return;

    const loadExistingAnswer = async () => {
      try {
        const { getSubmissionById } = await import('@/lib/firebase/submissions');
        const submission = await getSubmissionById(existingSubmissionId);

        if (submission?.dailyAnswer) {
          setGlobalDailyAnswer(submission.dailyAnswer);
          setLocalDailyAnswer(submission.dailyAnswer);
          loadedExistingDailyAnswerRef.current = true;
        }
      } catch (error) {
        logger.error('[Step3] Existing submission load error:', error);
      }
    };

    loadExistingAnswer();
  }, [existingSubmissionId, setGlobalDailyAnswer]);

  const handleSubmit = async () => {
    if (localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH) {
      toast({ title: `최소 ${SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH}자 이상 작성해주세요`, description: `현재 ${localDailyAnswer.length}자 입력됨`, variant: 'destructive' });
      return;
    }

    if (!participantId || !participationCode || !cohortId || !bookTitle) {
      toast({ title: '필수 정보가 누락되었습니다', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        participantId,
        participationCode,
        cohortId,
        submissionDate: submissionDate || getSubmissionDate(),
        bookTitle: bookTitle || '',
        bookAuthor: selectedBook?.author || null,
        bookCoverUrl: selectedBook?.image || null,
        bookDescription: selectedBook?.description || null,
        bookImageUrl: imageStorageUrl || null,
        review,
        dailyQuestion: dailyQuestion || '',
        dailyAnswer: localDailyAnswer,
        isEBook,
        status: 'approved' as const,
      };

      if (existingSubmissionId) {
        // 수정 모드: 기존 제출물 업데이트
        const { updateSubmission } = await import('@/lib/firebase/submissions');
        await updateSubmission(existingSubmissionId, submissionData);
      } else {
        // 새 제출: 새 문서 생성
        await createSubmission(submissionData, participant?.name || '');
      }

      // participant 책 정보 업데이트
      if (participantId && bookTitle) {
        await updateParticipantBookInfo(
          participantId,
          bookTitle,
          selectedBook?.author || undefined,
          selectedBook?.image || undefined
        );
      }

      // Draft 삭제
      if (participantId && participationCode) {
        try {
          const { getDraftSubmission } = await import('@/lib/firebase/submissions');
          const draft = await getDraftSubmission(participantId, cohortId, submissionDate || undefined);
          if (draft?.id) {
            const { deleteDraft } = await import('@/lib/firebase/submissions');
            await deleteDraft(draft.id);
          }
        } catch (error) {
          logger.error('[Step3] Draft deletion error:', error);
        }
      }

      reset();

      toast({ title: existingSubmissionId ? '수정 완료!' : '제출 완료!', description: '독서 인증이 성공적으로 제출되었습니다.' });

      router.replace(`${appRoutes.chat(cohortId)}?t=${Date.now()}&fresh=true`);
    } catch (error) {
      toast({ title: '제출 실패', description: error instanceof Error ? error.message : '다시 시도해주세요.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || !participant || !cohortId || isLoadingQuestion) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <SubmissionLayout
      currentStep={3}
      onBack={handleBack}
      mainPaddingBottom={mainPaddingBottom}
      footerPaddingBottom={footerPaddingBottom}
      footer={
        <UnifiedButton
          onClick={handleSubmit}
          disabled={isSubmitting || localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH}
          loading={isSubmitting}
          loadingText="제출 중..."
          className={localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH ? 'opacity-50' : ''}
        >
          {existingSubmissionId ? '수정 완료' : '제출하기'}
        </UnifiedButton>
      }
    >
      <div className="space-y-3">
        <h2 className="text-lg font-bold">마지막으로<br />오늘의 질문에 답해 주세요</h2>
        <p className="text-sm text-muted-foreground">매일 새로운 질문이 제공됩니다</p>
      </div>

      {/* 오늘의 질문 */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-blue-800 font-medium leading-relaxed">
          💬 {dailyQuestion || '오늘 하루는 어떠셨나요?'}
        </p>
      </div>

      {/* 답변 입력 */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <p className="text-sm text-gray-600">나의 답변</p>
          <div className="flex items-center gap-2">
            {isAutoSaving ? (
              <>
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-[10px] text-blue-500 font-medium">저장 중</span>
              </>
            ) : lastSavedAt ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-[10px] text-green-600 font-medium">저장됨</span>
              </>
            ) : null}
            <span className={`text-[10px] font-medium transition-colors ${localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH ? 'text-red-500' : 'text-blue-500'}`}>
              {localDailyAnswer.length}/{SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH}자
            </span>
          </div>
        </div>
        <Textarea
          value={localDailyAnswer}
          onChange={(e) => setLocalDailyAnswer(e.target.value)}
          placeholder="오늘의 질문에 대한 생각을 자유롭게 작성해주세요..."
          className="min-h-[200px] resize-none text-sm leading-relaxed rounded-xl border-gray-300 focus:border-blue-400 focus:ring-blue-400 p-4"
        />
        {localDailyAnswer.length > 0 && <p className="text-xs text-gray-400 px-1">작성 중인 내용은 자동으로 저장됩니다</p>}
      </div>

      {/* 제출 전 요약 */}
      <div className="rounded-xl bg-gray-50 p-4 space-y-3 mt-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          제출 전 확인
        </h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>책 제목: <span className="font-medium text-gray-800">{bookTitle || '미입력'}</span></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>감상평: <span className="font-medium text-gray-800">{review.length}자 작성</span></span>
          </div>
          <div className="flex items-start gap-2">
            <span className={localDailyAnswer.length >= SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH ? 'text-green-500' : 'text-red-500'}>
              {localDailyAnswer.length >= SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH ? '✓' : '✗'}
            </span>
            <span>오늘의 답변: <span className="font-medium text-gray-800">{localDailyAnswer.length}자 작성</span></span>
          </div>
          {isEBook && (
            <div className="flex items-start gap-2">
              <span className="text-blue-500">📱</span>
              <span>전자책 인증</span>
            </div>
          )}
        </div>
      </div>
    </SubmissionLayout>
  );
}

export default function Step3Page() {
  return (
    <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
      <Step3Content />
    </Suspense>
  );
}
