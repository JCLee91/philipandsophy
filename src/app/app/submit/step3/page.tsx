'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { useCreateSubmission, useUpdateSubmission } from '@/hooks/use-submissions';
import { uploadReadingImage, updateParticipantBookInfo, saveDraft } from '@/lib/firebase';
import { getDailyQuestion } from '@/lib/firebase/daily-questions';
import { getSubmissionDate } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { createFileFromUrl } from '@/lib/image-validation';
import TopBar from '@/components/TopBar';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Textarea } from '@/components/ui/textarea';
import { appRoutes } from '@/lib/navigation';
import type { DailyQuestion as DailyQuestionType } from '@/types/database';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { logger } from '@/lib/logger';
import { useDebounce } from 'react-use';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const existingSubmissionId = searchParams.get('edit');

  const { participant, isLoading: sessionLoading } = useAuth();
  const { toast } = useToast();
  const keyboardHeight = useKeyboardHeight();
  const footerPaddingBottom = useMemo(
    () =>
      keyboardHeight > 0
        ? `calc(16px + env(safe-area-inset-bottom, 0px))`
        : `calc(60px + env(safe-area-inset-bottom, 0px))`,
    [keyboardHeight]
  );

  const {
    imageFile,
    imageStorageUrl,
    selectedBook,
    manualTitle,
    review,
    dailyAnswer: globalDailyAnswer,
    participantId,
    participationCode,
    setImageFile,
    setDailyAnswer: setGlobalDailyAnswer,
    setSelectedBook,
    setManualTitle,
    setReview,
    setImageStorageUrl,
    setMetaInfo,
    reset
  } = useSubmissionFlowStore();

  // ✅ Local state for performance (prevent global store updates on every keystroke)
  const [localDailyAnswer, setLocalDailyAnswer] = useState(globalDailyAnswer);

  // Sync local state with global state when global state changes (initial load)
  useEffect(() => {
    setLocalDailyAnswer(globalDailyAnswer);
  }, [globalDailyAnswer]);

  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestionType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false); // Manual save state
  const [isAutoSaving, setIsAutoSaving] = useState(false); // Auto save state
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();

  // ✅ Debounce global state update and auto-save
  useDebounce(
    async () => {
      if (localDailyAnswer === globalDailyAnswer) return;

      // 1. Update Global Store
      setGlobalDailyAnswer(localDailyAnswer);

      // 2. Auto-save if conditions met (신규/수정 모두 동일하게 자동저장)
      if (
        participantId &&
        participationCode &&
        localDailyAnswer.length > 10 &&
        !isSubmittingRef.current
      ) {
        await performAutoSave(localDailyAnswer);
      }
    },
    1000, // 1 second debounce
    [localDailyAnswer]
  );

  // Auto-save function
  const performAutoSave = async (currentAnswer: string) => {
    if (!participantId || !participationCode) return;

    setIsAutoSaving(true);
    try {
      const draftData: any = {
        dailyAnswer: currentAnswer,
        // 수정 모드인 경우 원본 submissionId 저장
        ...(existingSubmissionId && { editingSubmissionId: existingSubmissionId }),
      };

      if (participant?.cohortId) {
        draftData.cohortId = participant.cohortId;
      }

      await saveDraft(participantId, participationCode, draftData, participant?.name);
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Auto-save failed', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Step 2 검증 (제출 중일 때는 검증 건너뛰기)
  useEffect(() => {
    if (isSubmittingRef.current) return; // 제출 중이면 검증 안 함

    const finalTitle = selectedBook?.title || manualTitle.trim();
    if (!finalTitle && !existingSubmissionId) {
      toast({
        title: '책 제목을 먼저 입력해주세요',
        variant: 'destructive',
      });
      router.replace(`${appRoutes.submitStep2}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    }
  }, [selectedBook, manualTitle, existingSubmissionId, cohortId, router, toast]);

  // 인증 확인
  useEffect(() => {
    if (!sessionLoading && (!participant || !cohortId)) {
      router.replace('/app');
    }
  }, [sessionLoading, participant, cohortId, router]);

  // 메타 정보 보강 (Step2를 거치지 않았을 경우 대비)
  useEffect(() => {
    if (!participant || !cohortId || participantId) return; // 이미 세팅된 경우는 건너뜀

    const participationCodeValue = participant.participationCode || participant.id;
    setMetaInfo(participant.id, participationCodeValue, cohortId, existingSubmissionId || undefined);
  }, [participant, participantId, cohortId, existingSubmissionId, setMetaInfo]);

  const hasLoadedDraftRef = useRef(false);
  const hasLoadedExistingRef = useRef(false);

  // 임시저장 자동 불러오기 + 일일 질문 로드
  useEffect(() => {
    if (!cohortId || existingSubmissionId || !participantId || hasLoadedDraftRef.current) {
      return;
    }

    hasLoadedDraftRef.current = true;

    const loadDraftAndQuestion = async () => {
      setIsLoadingDraft(true);
      setLoadError(null);

      try {
        // 1. 임시저장 불러오기
        const { getDraftSubmission } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participantId, cohortId);

        if (draft?.dailyAnswer) {
          setGlobalDailyAnswer(draft.dailyAnswer); // Update global
          setLocalDailyAnswer(draft.dailyAnswer); // Update local
        }

        // 2. 일일 질문 로드
        const submissionDate = getSubmissionDate();
        const question = await getDailyQuestion(cohortId, submissionDate);
        if (question) {
          setDailyQuestion(question);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        setLoadError(errorMessage);
        toast({
          title: '불러오기 실패',
          description: '임시저장된 내용을 불러올 수 없습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraftAndQuestion();
  }, [cohortId, existingSubmissionId, participantId, setGlobalDailyAnswer, toast]);

  useEffect(() => {
    if (!cohortId || !existingSubmissionId || hasLoadedExistingRef.current) {
      return;
    }

    let cancelled = false;

    const loadExistingSubmission = async () => {
      setIsLoadingDraft(true);
      try {
        const { getSubmissionById } = await import('@/lib/firebase/submissions');
        const submission = await getSubmissionById(existingSubmissionId);
        if (!submission || cancelled) return;

        hasLoadedExistingRef.current = true;

        if (submission.bookImageUrl && !imageStorageUrl) {
          try {
            const file = await createFileFromUrl(submission.bookImageUrl);
            if (!cancelled) {
              setImageFile(file, submission.bookImageUrl, submission.bookImageUrl);
            }
          } catch (error) {
            if (!cancelled) {
              setImageFile(null, submission.bookImageUrl, submission.bookImageUrl);
            }
          }
          if (!cancelled) {
            setImageStorageUrl(submission.bookImageUrl);
          }
        }

        if (submission.bookTitle) {
          if (submission.bookAuthor || submission.bookCoverUrl || submission.bookDescription) {
            setSelectedBook({
              title: submission.bookTitle,
              author: submission.bookAuthor || '',
              image: submission.bookCoverUrl || '',
              description: submission.bookDescription || '',
              isbn: '',
              publisher: '',
              pubdate: '',
              link: '',
              discount: '',
            });
            setManualTitle('');
          } else {
            setSelectedBook(null);
            setManualTitle(submission.bookTitle);
          }
        }

        // review는 Step2에서 이미 수정했을 수 있으므로, store에 값이 없을 때만 로드
        if (submission.review && !review) {
          setReview(submission.review);
        }

        // dailyAnswer는 Step3에서 입력하므로 항상 DB 값 로드
        if (submission.dailyAnswer) {
          setGlobalDailyAnswer(submission.dailyAnswer);
          setLocalDailyAnswer(submission.dailyAnswer);
        }

        const questionDate = submission.submissionDate || getSubmissionDate();
        const question = await getDailyQuestion(cohortId, questionDate);
        if (!cancelled) {
          setDailyQuestion(
            question ||
            (submission.dailyQuestion
              ? {
                id: 'custom',
                dayNumber: 0,
                date: questionDate,
                question: submission.dailyQuestion,
                category: '가치관 & 삶',
                order: 0,
                createdAt: null as any,
                updatedAt: null as any,
              }
              : null)
          );
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
          setLoadError(errorMessage);
          toast({
            title: '제출물 불러오기 실패',
            description: '이전 제출을 불러오지 못했습니다. 다시 시도해주세요.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    };

    loadExistingSubmission();

    return () => {
      cancelled = true;
    };
  }, [cohortId, existingSubmissionId, imageStorageUrl, review, setImageFile, setImageStorageUrl, setSelectedBook, setManualTitle, setReview, setGlobalDailyAnswer, toast]);

  const handleSaveDraft = async () => {
    // 수정 모드에서도 임시저장 허용 (신규/수정 모두 동일한 UX)

    if (!participantId || !participationCode) {
      toast({
        title: '세션 정보가 없습니다',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const draftData: {
        bookImageUrl?: string;
        bookTitle?: string;
        bookAuthor?: string;
        bookCoverUrl?: string;
        bookDescription?: string;
        review?: string;
        dailyQuestion?: string;
        dailyAnswer?: string;
        cohortId?: string;
        editingSubmissionId?: string;
      } = {
        // 수정 모드인 경우 원본 submissionId 저장
        ...(existingSubmissionId && { editingSubmissionId: existingSubmissionId }),
      };

      // 이미지가 있으면 업로드 (File 객체인 경우만)
      if (imageFile && imageFile instanceof File && !imageStorageUrl) {
        const uploadedUrl = await uploadReadingImage(imageFile, participationCode, cohortId);
        draftData.bookImageUrl = uploadedUrl;
        setImageStorageUrl(uploadedUrl);
      } else if (imageStorageUrl) {
        draftData.bookImageUrl = imageStorageUrl;
      }

      // 각 필드는 값이 있을 때만 포함 (undefined로 덮어쓰기 방지)
      if (selectedBook?.title || manualTitle) {
        draftData.bookTitle = selectedBook?.title || manualTitle;
      }
      if (selectedBook?.author) {
        draftData.bookAuthor = selectedBook.author;
      }
      if (selectedBook?.image) {
        draftData.bookCoverUrl = selectedBook.image;
      }
      if (selectedBook?.description) {
        draftData.bookDescription = selectedBook.description;
      }
      if (review) {
        draftData.review = review;
      }
      if (dailyQuestion?.question) {
        draftData.dailyQuestion = dailyQuestion.question;
      }
      // Use local answer for explicit save
      if (localDailyAnswer) {
        draftData.dailyAnswer = localDailyAnswer;
      }

      // 🆕 cohortId 추가 (중복 참가자 구분용)
      if (participant?.cohortId) {
        draftData.cohortId = participant.cohortId;
      }

      await saveDraft(participantId, participationCode, draftData, participant?.name);
      setLastSavedAt(new Date());

      toast({
        title: '임시 저장되었습니다',
        description: '언제든 다시 돌아와서 작성을 이어갈 수 있습니다.',
      });

      // 페이지 이동 제거 - 현재 페이지에 머물기
    } catch (error) {
      toast({
        title: '임시 저장 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if ((!imageFile && !imageStorageUrl) || !participantId || !participationCode) {
      toast({
        title: '필수 정보가 누락되었습니다',
        variant: 'destructive',
      });
      return;
    }

    const finalTitle = selectedBook?.title || manualTitle.trim();
    if (!finalTitle) {
      toast({
        title: '책 제목을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (!localDailyAnswer.trim()) {
      toast({
        title: '오늘의 질문에 답변해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH) {
      toast({
        title: `최소 ${SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH}자 이상 작성해주세요`,
        description: `현재 ${localDailyAnswer.length}자 입력됨`,
        variant: 'destructive',
      });
      return;
    }

    const isEditing = Boolean(existingSubmissionId);

    setUploading(true);
    isSubmittingRef.current = true; // 제출 시작 - 검증 useEffect 비활성화

    try {
      // 단계 1: 책 정보 저장
      setUploadStep('책 정보 저장 중...');
      await updateParticipantBookInfo(
        participantId,
        finalTitle,
        selectedBook?.author || undefined,
        selectedBook?.image || undefined
      );

      // 단계 2: 이미지 업로드
      let bookImageUrl = imageStorageUrl;
      if (!bookImageUrl && imageFile) {
        setUploadStep('이미지 업로드 중...');
        bookImageUrl = await uploadReadingImage(imageFile, participationCode, cohortId);
        setImageStorageUrl(bookImageUrl);
      }

      const submissionPayload = {
        bookTitle: finalTitle,
        ...(selectedBook?.author && { bookAuthor: selectedBook.author }),
        ...(selectedBook?.image && { bookCoverUrl: selectedBook.image }),
        ...(selectedBook?.description && { bookDescription: selectedBook.description }),
        ...(bookImageUrl && { bookImageUrl }),
        review: review.trim(),
        dailyQuestion: dailyQuestion?.question || '',
        dailyAnswer: localDailyAnswer.trim(),
        status: 'approved' as const,
        // 🆕 cohortId 추가 (중복 참가자 구분용, participant 우선)
        ...((participant?.cohortId || cohortId) && { cohortId: participant?.cohortId || cohortId }),
      };

      // 단계 3: 제출물 저장
      setUploadStep('제출물 저장 중...');

      if (isEditing && existingSubmissionId) {
        await updateSubmission.mutateAsync({
          id: existingSubmissionId,
          data: submissionPayload,
        });
      } else {
        await createSubmission.mutateAsync({
          data: {
            participantId,
            participationCode,
            ...submissionPayload,
            submittedAt: Timestamp.now(),
          },
          participantName: participant?.name || '익명',
        });
      }

      if (!isEditing) {
        try {
          const { getDraftSubmission, deleteDraft } = await import('@/lib/firebase/submissions');
          const draft = await getDraftSubmission(participantId, cohortId!);
          if (draft) {
            await deleteDraft(draft.id);
          }
        } catch (error) {
          logger.error('[Step3] Draft deletion failed', error);
        }
      }

      // 토스트는 메인 화면에서 표시하기 위해 쿼리 파라미터로 전달
      const successMessage = isEditing ? 'edit' : 'submit';
      router.push(`${appRoutes.chat(cohortId!)}?success=${successMessage}`);
      // reset() 제거 - 다음 제출 시작 시 자동으로 초기화됨
      return;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : '독서 인증 제출 중 오류가 발생했습니다.';

      toast({
        title: '제출 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadStep('');
      isSubmittingRef.current = false; // 항상 해제
    }
  };

  if (sessionLoading || !participant || !cohortId || isLoadingDraft) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  // 로드 실패 시 재시도 화면
  if (loadError && !dailyQuestion) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden bg-background">
          <TopBar onBack={handleBack} title="독서 인증하기" align="left" />
          <div className="fixed top-14 left-0 right-0 z-[998]">
            <ProgressIndicator currentStep={3} />
          </div>

          <main className="app-main-content flex-1 flex items-center justify-center pt-4">
            <div className="text-center space-y-4 px-6">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-bold text-gray-900">
                질문을 불러올 수 없습니다
              </h3>
              <p className="text-sm text-gray-600">
                네트워크 연결을 확인하고 다시 시도해주세요
              </p>
              <UnifiedButton
                onClick={() => {
                  hasLoadedDraftRef.current = false;
                  setLoadError(null);
                  window.location.reload();
                }}
                className="mt-4"
              >
                다시 시도
              </UnifiedButton>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background">
        <TopBar onBack={handleBack} title="독서 인증하기" align="left" />
        <div className="fixed top-14 left-0 right-0 z-[998]">
          <ProgressIndicator currentStep={3} />
        </div>

        <main
          className="app-main-content flex-1 overflow-y-auto pt-4"
          style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 32 }}
        >
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold">오늘의 질문</h2>
            </div>

            {dailyQuestion && (
              <div className="relative rounded-xl bg-blue-50 border border-blue-200 px-4 py-4">
                <span className="inline-block px-3 py-1 mb-2 text-xs font-semibold text-white bg-blue-500 rounded-full">
                  {dailyQuestion.category}
                </span>
                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                  {dailyQuestion.question}
                </p>
              </div>
            )}

            {/* 질문 답변 입력 */}
            <div className="space-y-3">
              <div className="flex justify-end h-5">
                {/* Auto-save indicator */}
                <div className="flex items-center gap-1.5">
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
                </div>
              </div>
              <div className="relative">
                <Textarea
                  value={localDailyAnswer}
                  onChange={(e) => setLocalDailyAnswer(e.target.value)}
                  placeholder="질문에 대한 답변을 자유롭게 작성해 주세요"
                  className="min-h-[280px] resize-none text-sm leading-relaxed rounded-xl border-gray-300 focus:border-blue-400 focus:ring-blue-400 p-4"
                  disabled={uploading}
                />
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-gray-400">
                  {localDailyAnswer.length > 0 && '작성 중인 내용은 자동으로 저장됩니다'}
                </span>
                <p className={`text-xs transition-colors ${localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH
                  ? 'text-red-500 font-medium'
                  : 'text-blue-500'
                  }`}>
                  {localDailyAnswer.length} / {SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH}자
                </p>
              </div>
            </div>

            {uploadStep && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm font-medium text-blue-900">{uploadStep}</p>
              </div>
            )}
          </div>
        </main>

        {/* 하단 버튼 */}
        <div className="border-t bg-white">
          <div
            className="mx-auto flex w-full max-w-xl gap-2 px-6 pt-4"
            style={{ paddingBottom: footerPaddingBottom }}
          >
            <UnifiedButton
              onClick={handleSubmit}
              className={cn(
                existingSubmissionId ? 'w-full' : 'flex-1',
                // 유효성 검사 실패 시 시각적으로만 비활성화 처리
                (uploading || isSaving || !localDailyAnswer.trim() || localDailyAnswer.length < SUBMISSION_VALIDATION.MIN_DAILY_ANSWER_LENGTH) && "opacity-50"
              )}
              disabled={uploading || isSaving}
            >
              {uploading ? uploadStep || '제출 중...' : existingSubmissionId ? '수정하기' : '제출하기'}
            </UnifiedButton>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default function Step3Page() {
  return (
    <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
      <Step3Content />
    </Suspense>
  );
}
