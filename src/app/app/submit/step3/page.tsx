'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
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
import BackHeader from '@/components/BackHeader';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Textarea } from '@/components/ui/textarea';
import { appRoutes } from '@/lib/navigation';
import type { DailyQuestion as DailyQuestionType } from '@/types/database';

export const dynamic = 'force-dynamic';

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const existingSubmissionId = searchParams.get('edit');

  const { participant, isLoading: sessionLoading } = useAuth();
  const { toast } = useToast();

  const {
    imageFile,
    imageStorageUrl,
    selectedBook,
    manualTitle,
    review,
    dailyAnswer,
    participantId,
    participationCode,
    setImageFile,
    setDailyAnswer,
    setSelectedBook,
    setManualTitle,
    setReview,
    setImageStorageUrl,
    reset
  } = useSubmissionFlowStore();

  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestionType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();

  // Step 2 검증 (제출 중일 때는 검증 건너뛰기)
  useEffect(() => {
    if (isSubmitting) return; // 제출 중이면 검증 안 함

    const finalTitle = selectedBook?.title || manualTitle.trim();
    if (!finalTitle && !existingSubmissionId) {
      toast({
        title: '책 제목을 먼저 입력해주세요',
        variant: 'destructive',
      });
      router.replace(`${appRoutes.submitStep2}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    }
  }, [selectedBook, manualTitle, existingSubmissionId, cohortId, router, toast, isSubmitting]);

  // 인증 확인
  useEffect(() => {
    if (!sessionLoading && (!participant || !cohortId)) {
      router.replace('/app');
    }
  }, [sessionLoading, participant, cohortId, router]);

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
      try {
        // 1. 임시저장 불러오기
        const { getDraftSubmission } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participantId, cohortId);

        if (draft?.dailyAnswer) {
          setDailyAnswer(draft.dailyAnswer);
          toast({
            title: '임시 저장된 내용을 불러왔습니다',
            description: '이어서 작성하실 수 있습니다.',
          });
        }

        // 2. 일일 질문 로드
        const submissionDate = getSubmissionDate();
        const question = await getDailyQuestion(cohortId, submissionDate);
        if (question) {
          setDailyQuestion(question);
        }
      } catch (error) {
        // 에러 무시
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraftAndQuestion();
  }, [cohortId, existingSubmissionId, participantId, setDailyAnswer, toast]);

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

        if (submission.review) {
          setReview(submission.review);
        }

        if (submission.dailyAnswer) {
          setDailyAnswer(submission.dailyAnswer);
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
  }, [cohortId, existingSubmissionId, imageStorageUrl, setImageFile, setImageStorageUrl, setSelectedBook, setManualTitle, setReview, setDailyAnswer, toast]);

  const handleSaveDraft = async () => {
    if (existingSubmissionId) {
      toast({
        title: '임시 저장을 사용할 수 없습니다',
        description: '제출물 수정 시에는 임시 저장을 지원하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }

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
      } = {};

      // 이미지가 있으면 업로드 (File 객체인 경우만)
      if (imageFile && imageFile instanceof File && !imageStorageUrl) {
        const uploadedUrl = await uploadReadingImage(imageFile, participationCode);
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
      if (dailyAnswer) {
        draftData.dailyAnswer = dailyAnswer;
      }

      await saveDraft(participantId, participationCode, draftData);

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

    if (!dailyAnswer.trim()) {
      toast({
        title: '오늘의 질문에 답변해주세요',
        variant: 'destructive',
      });
      return;
    }

    const isEditing = Boolean(existingSubmissionId);

    setUploading(true);
    setIsSubmitting(true); // 제출 시작 - 검증 useEffect 비활성화

    try {
      setUploadStep('책 정보 저장 중...');
      await updateParticipantBookInfo(
        participantId,
        finalTitle,
        selectedBook?.author || undefined,
        selectedBook?.image || undefined
      );

      let bookImageUrl = imageStorageUrl;
      if (!bookImageUrl && imageFile) {
        setUploadStep('이미지 업로드 중...');
        bookImageUrl = await uploadReadingImage(imageFile, participationCode);
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
        dailyAnswer: dailyAnswer.trim(),
        status: 'approved' as const,
      };

      setUploadStep('제출물 저장 중...');

      if (isEditing && existingSubmissionId) {
        await updateSubmission.mutateAsync({
          id: existingSubmissionId,
          data: submissionPayload,
        });
      } else {
        await createSubmission.mutateAsync({
          participantId,
          participationCode,
          ...submissionPayload,
          submittedAt: Timestamp.now(),
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
          console.error('Draft deletion failed:', error);
        }
      }

      toast({
        title: isEditing ? '독서 인증 수정 완료 ✅' : '독서 인증 완료 ✅',
        description: isEditing
          ? '수정된 내용이 저장되었습니다.'
          : '오늘의 서재에서 다른 멤버들의 프로필을 확인해보세요!',
      });

      router.push(appRoutes.chat(cohortId!));
      setTimeout(() => {
        reset();
        setIsSubmitting(false); // 리셋 후 플래그도 해제
      }, 100);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : '독서 인증 제출 중 오류가 발생했습니다.';

      toast({
        title: '제출 실패',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsSubmitting(false); // 에러 시에도 플래그 해제
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  if (sessionLoading || !participant || !cohortId || isLoadingDraft) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background">
        <BackHeader onBack={handleBack} title="독서 인증하기" variant="left" />
        <div className="fixed top-14 left-0 right-0 z-[998]">
          <ProgressIndicator currentStep={3} />
        </div>

        <main className="app-main-content flex-1 overflow-y-auto pt-[57px]">
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
              <Textarea
                value={dailyAnswer}
                onChange={(e) => setDailyAnswer(e.target.value)}
                placeholder="질문에 대한 답변을 자유롭게 작성해 주세요"
                className="min-h-[280px] resize-none text-sm leading-relaxed rounded-xl border-gray-300 focus:border-blue-400 focus:ring-blue-400"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground text-right">
                ({dailyAnswer.length}자)
              </p>
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
          <div className="mx-auto flex w-full max-w-xl gap-2 px-6 pt-4 pb-[60px]">
            {!existingSubmissionId && (
              <UnifiedButton
                variant="outline"
                onClick={handleSaveDraft}
                className="flex-1"
                disabled={uploading || isSaving}
              >
                {isSaving ? '저장 중...' : '임시 저장하기'}
              </UnifiedButton>
            )}
            <UnifiedButton
              onClick={handleSubmit}
              className={existingSubmissionId ? 'w-full' : 'flex-1'}
              disabled={uploading || isSaving || !dailyAnswer.trim()}
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
