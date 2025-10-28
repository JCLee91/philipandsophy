'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { useCreateSubmission, useSubmissionsByParticipant } from '@/hooks/use-submissions';
import { uploadReadingImage, updateParticipantBookInfo, saveDraft } from '@/lib/firebase';
import { getDailyQuestion } from '@/lib/firebase/daily-questions';
import { getSubmissionDate, getTodayString } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import BackHeader from '@/components/BackHeader';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { appRoutes } from '@/lib/navigation';
import type { DailyQuestion as DailyQuestionType } from '@/types/database';
import { toZonedTime } from 'date-fns-tz';
import type { ReadingSubmission } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * 보상 대상 여부 확인
 */
function checkNeedsCompensation(submissions: ReadingSubmission[]): boolean {
  const today = getTodayString();
  if (today !== '2025-10-28') {
    return false;
  }

  const oct27Submission = submissions.find(sub => sub.submissionDate === '2025-10-27');
  if (!oct27Submission || !oct27Submission.submittedAt) {
    return false;
  }

  const submittedAtDate = oct27Submission.submittedAt.toDate();
  const submittedAtKST = toZonedTime(submittedAtDate, 'Asia/Seoul');
  const hour = submittedAtKST.getHours();
  const day = submittedAtKST.getDate();

  return day === 28 && hour >= 0 && hour < 2;
}

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const existingSubmissionId = searchParams.get('edit');

  const { participant, isLoading: sessionLoading } = useAuth();
  const { toast } = useToast();

  const {
    imageFile,
    selectedBook,
    manualTitle,
    review,
    dailyAnswer,
    participantId,
    participationCode,
    setDailyAnswer,
    reset
  } = useSubmissionFlowStore();

  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestionType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const createSubmission = useCreateSubmission();
  const { data: allSubmissions = [] } = useSubmissionsByParticipant(participantId || '');

  // Step 2 검증
  useEffect(() => {
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

  // 임시저장 자동 불러오기 + 일일 질문 로드
  useEffect(() => {
    if (!cohortId || existingSubmissionId) return;

    const loadDraftAndQuestion = async () => {
      setIsLoadingDraft(true);
      try {
        // 1. 임시저장 불러오기
        if (participantId && !dailyAnswer) {
          const { getDraftSubmission } = await import('@/lib/firebase/submissions');
          const draft = await getDraftSubmission(participantId, cohortId);

          if (draft?.dailyAnswer) {
            setDailyAnswer(draft.dailyAnswer);
            toast({
              title: '임시 저장된 내용을 불러왔습니다',
              description: '이어서 작성하실 수 있습니다.',
            });
          }
        }

        // 2. 일일 질문 로드
        const submissionDate = getSubmissionDate();
        const needsCompensation = checkNeedsCompensation(allSubmissions);

        let questionDate = submissionDate;
        if (needsCompensation) {
          questionDate = '2025-10-27';
        }

        const question = await getDailyQuestion(cohortId, questionDate);
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
  }, [cohortId, allSubmissions, existingSubmissionId, participantId, dailyAnswer, setDailyAnswer, toast]);

  const handleSaveDraft = async () => {
    if (!participantId || !participationCode) {
      toast({
        title: '세션 정보가 없습니다',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      let bookImageUrl = '';

      // 이미지가 있으면 업로드
      if (imageFile) {
        bookImageUrl = await uploadReadingImage(imageFile, participationCode);
      }

      await saveDraft(participantId, participationCode, {
        bookImageUrl: bookImageUrl || undefined,
        bookTitle: selectedBook?.title || manualTitle || undefined,
        bookAuthor: selectedBook?.author || undefined,
        bookCoverUrl: selectedBook?.image || undefined,
        bookDescription: selectedBook?.description || undefined,
        review: review || undefined,
        dailyQuestion: dailyQuestion?.question || undefined,
        dailyAnswer: dailyAnswer || undefined,
      });

      toast({
        title: '임시 저장되었습니다',
        description: '언제든 다시 돌아와서 작성을 이어갈 수 있습니다.',
      });

      router.push(appRoutes.chat(cohortId!));
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
    if (!imageFile || !participantId || !participationCode) {
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

    setUploading(true);

    try {
      // 1. 책 정보 업데이트
      setUploadStep('책 정보 저장 중...');
      await updateParticipantBookInfo(
        participantId,
        finalTitle,
        selectedBook?.author || undefined,
        selectedBook?.image || undefined
      );

      // 2. 이미지 업로드
      setUploadStep('이미지 업로드 중...');
      const bookImageUrl = await uploadReadingImage(imageFile, participationCode);

      // 3. 제출물 생성
      setUploadStep('제출물 저장 중...');
      await createSubmission.mutateAsync({
        participantId,
        participationCode,
        bookTitle: finalTitle,
        ...(selectedBook?.author && { bookAuthor: selectedBook.author }),
        ...(selectedBook?.image && { bookCoverUrl: selectedBook.image }),
        ...(selectedBook?.description && { bookDescription: selectedBook.description }),
        bookImageUrl,
        review: review.trim(), // Step 2의 감상평
        dailyQuestion: dailyQuestion?.question || '',
        dailyAnswer: dailyAnswer.trim(), // Step 3의 질문 답변
        submittedAt: Timestamp.now(),
        status: 'approved',
      });

      toast({
        title: '독서 인증 완료 ✅',
        description: '오늘의 서재에서 다른 멤버들의 프로필을 확인해보세요!',
      });

      // 상태 초기화
      reset();

      // 채팅 페이지로 이동
      router.push(appRoutes.chat(cohortId!));

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
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
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
          <div className="mx-auto flex w-full max-w-xl gap-2 px-4 pt-4 pb-[60px]">
            <UnifiedButton
              variant="outline"
              onClick={handleSaveDraft}
              className="flex-1"
              disabled={uploading || isSaving}
            >
              {isSaving ? '저장 중...' : '임시 저장하기'}
            </UnifiedButton>
            <UnifiedButton
              onClick={handleSubmit}
              className="flex-1"
              disabled={uploading || isSaving || !dailyAnswer.trim()}
            >
              {uploading ? uploadStep || '제출 중...' : '제출하기'}
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
