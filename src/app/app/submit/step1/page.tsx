'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { validateImageFile, compressImageIfNeeded, createFileFromUrl } from '@/lib/image-validation';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { useToast } from '@/hooks/use-toast';
import { saveDraft, uploadReadingImage } from '@/lib/firebase';
import BackHeader from '@/components/BackHeader';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { appRoutes } from '@/lib/navigation';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

export const dynamic = 'force-dynamic';

function Step1Content() {
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
    imagePreview,
    imageStorageUrl,
    setImageFile,
    setMetaInfo,
    setImageStorageUrl,
    setSelectedBook,
    setManualTitle,
    setReview,
    setDailyAnswer,
    participantId,
    participationCode,
  } = useSubmissionFlowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const hasLoadedDraftRef = useRef(false);

  // 메타 정보 설정
  useEffect(() => {
    if (participant && cohortId) {
      // participationCode는 participant의 participationCode 필드를 사용, 없으면 participant.id를 사용
      // Storage 경로: reading_submissions/{participationCode}/ (각 참가자별로 분리)
      const participationCode = participant.participationCode || participant.id;
      setMetaInfo(participant.id, participationCode, cohortId, existingSubmissionId || undefined);
    }
  }, [participant, cohortId, existingSubmissionId, setMetaInfo]);

  // 임시저장 자동 불러오기
  useEffect(() => {
    if (!participant || !cohortId || existingSubmissionId || imageFile || hasLoadedDraftRef.current) return;

    hasLoadedDraftRef.current = true;
    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const { getDraftSubmission } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participant.id, cohortId);

        if (draft?.bookImageUrl) {
          // URL에서 File 객체 생성 (다음 단계 진행 가능하도록)
          const file = await createFileFromUrl(draft.bookImageUrl);
          setImageFile(file, draft.bookImageUrl, draft.bookImageUrl);
          setImageStorageUrl(draft.bookImageUrl);
          toast({
            title: '임시 저장된 내용을 불러왔습니다',
            description: '이어서 작성하실 수 있습니다.',
          });
        }
      } catch (error) {
        // 에러 무시 (draft 없을 수 있음)
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [participant, cohortId, existingSubmissionId, imageFile, setImageFile, setImageStorageUrl, toast]);

  const hasLoadedExistingRef = useRef(false);

  useEffect(() => {
    if (!participant || !cohortId || !existingSubmissionId || hasLoadedExistingRef.current) return;

    const loadExistingSubmission = async () => {
      setIsLoadingDraft(true);
      try {
        const { getSubmissionById } = await import('@/lib/firebase/submissions');
        const submission = await getSubmissionById(existingSubmissionId);
        if (!submission) return;

        hasLoadedExistingRef.current = true;

        if (submission.bookImageUrl) {
          try {
            const file = await createFileFromUrl(submission.bookImageUrl);
            setImageFile(file, submission.bookImageUrl, submission.bookImageUrl);
          } catch (error) {
            setImageFile(null, submission.bookImageUrl, submission.bookImageUrl);
          }
          setImageStorageUrl(submission.bookImageUrl);
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
      } catch (error) {
        toast({
          title: '제출물 불러오기 실패',
          description: '이전 제출을 불러오지 못했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadExistingSubmission();
  }, [participant, cohortId, existingSubmissionId, setImageFile, setImageStorageUrl, setSelectedBook, setManualTitle, setReview, setDailyAnswer, toast]);

  // 인증 확인
  useEffect(() => {
    if (!sessionLoading && (!participant || !cohortId)) {
      router.replace('/app');
    }
  }, [sessionLoading, participant, cohortId, router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 파일 유효성 검증
      const validation = validateImageFile(file, SUBMISSION_VALIDATION.MAX_IMAGE_SIZE / (1024 * 1024));
      if (!validation.valid) {
        toast({
          title: '파일 검증 실패',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      // 10MB 이상이면 자동 압축
      const processedFile = await compressImageIfNeeded(file);

      // 이미지 미리보기
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(processedFile, reader.result as string);
      };
      reader.onerror = () => {
        toast({
          title: '이미지 로드 실패',
          description: '이미지를 불러올 수 없습니다.',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      toast({
        title: '이미지 처리 실패',
        description: error instanceof Error ? error.message : '이미지를 처리할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null, null);
    setImageStorageUrl(null);
  };

  const handleNext = async () => {
    if (!imageFile && !imageStorageUrl) {
      toast({
        title: '이미지를 선택해주세요',
        description: '책의 마지막 페이지를 촬영해주세요.',
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

    // 이미지 업로드 후 바로 이동 (draft 저장은 백그라운드)
    setIsProcessing(true);
    try {
      let bookImageUrl = imageStorageUrl;
      if (!bookImageUrl) {
        bookImageUrl = await uploadReadingImage(imageFile, participationCode);
        setImageStorageUrl(bookImageUrl);
      }

      await saveDraft(participantId, participationCode, { bookImageUrl });

      // 이미지 업로드 완료되면 바로 다음 페이지로
      router.push(`${appRoutes.submitStep2}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    } catch (error) {
      toast({
        title: '이미지 업로드 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  if (sessionLoading || !participant || !cohortId || isLoadingDraft) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background">
        <BackHeader onBack={() => router.back()} title="독서 인증하기" variant="left" />
        <div className="fixed top-14 left-0 right-0 z-[998]">
          <ProgressIndicator currentStep={1} />
        </div>

        <main
          className="app-main-content flex-1 overflow-y-auto pt-[57px]"
          style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 32 }}
        >
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-6">
            <div className="space-y-3">
              <h2 className="text-lg font-bold">읽은 책의 마지막 페이지를<br />업로드해 주세요</h2>
              <p className="text-sm text-muted-foreground">
                사진은 제출하면 다시 수정할 수 없어요
              </p>
            </div>

            {/* 이미지 업로드 영역 */}
            {!imagePreview ? (
              <label
                htmlFor="book-image"
                className="flex flex-col items-center justify-center aspect-[4/3] w-full border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:border-blue-300 transition-colors bg-blue-50/30"
              >
                <Upload className="h-12 w-12 text-blue-400 mb-4" />
                <p className="text-sm font-medium text-gray-700">이미지를 업로드하려면 클릭하세요</p>
                <p className="text-xs text-gray-500 mt-2">최대 50MB, JPG/PNG/HEIC</p>
                <input
                  id="book-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            ) : (
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border-2 border-blue-200">
                <Image
                  src={imagePreview}
                  alt="책 마지막 페이지"
                  width={800}
                  height={600}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black rounded-full transition-colors"
                  aria-label="이미지 제거"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            )}
          </div>
        </main>

        {/* 하단 버튼 */}
        <div className="border-t bg-white">
          <div
            className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pt-4"
            style={{ paddingBottom: footerPaddingBottom }}
          >
            <UnifiedButton
              onClick={handleNext}
              disabled={!imageFile || isProcessing}
              loading={isProcessing}
              loadingText="업로드 중..."
            >
              다음
            </UnifiedButton>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default function Step1Page() {
  return (
    <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
      <Step1Content />
    </Suspense>
  );
}
