'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { validateImageFile, compressImageIfNeeded, createFileFromUrl } from '@/lib/image-validation';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { saveDraft, uploadReadingImage } from '@/lib/firebase';
import { useSubmissionCommon } from '@/hooks/use-submission-common';
import SubmissionLayout from '@/components/submission/SubmissionLayout';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Upload, X, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { appRoutes } from '@/lib/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export function Step1Content() {
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
    handleBackToChat,
  } = useSubmissionCommon();


  const {
    imageFile,
    imagePreview,
    imageStorageUrl,
    setImageFile,
    setImageStorageUrl,
    clearImagePreview,
    setSelectedBook,
    setManualTitle,
    setReview,
    setDailyAnswer,
    isEBook,
    setIsEBook,
    isDailyRetrospective,
    setIsDailyRetrospective,
  } = useSubmissionFlowStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const hasLoadedDraftRef = useRef(false);
  const hasLoadedExistingRef = useRef(false);

  const { _hasHydrated } = useSubmissionFlowStore();

  // 🔍 DEBUG: 로딩 상태 추적
  useEffect(() => {
    console.log('[Step1 DEBUG] 상태 변경:', {
      _hasHydrated,
      sessionLoading,
      participant: participant ? `${participant.id} (${participant.name})` : null,
      cohortId,
      isLoadingDraft,
      imageFile: imageFile ? 'exists' : null,
      imageStorageUrl,
      isEBook,
      isDailyRetrospective,
    });
  }, [_hasHydrated, sessionLoading, participant, cohortId, isLoadingDraft, imageFile, imageStorageUrl, isEBook, isDailyRetrospective]);

  // 임시저장 자동 불러오기
  useEffect(() => {
    console.log('[Step1 DEBUG] Draft 로드 조건 체크:', {
      participant: !!participant,
      cohortId,
      existingSubmissionId,
      imageFile: !!imageFile,
      hasLoadedDraftRef: hasLoadedDraftRef.current,
    });
    if (!participant || !cohortId || existingSubmissionId || imageFile || hasLoadedDraftRef.current) return;

    hasLoadedDraftRef.current = true;
    let cancelled = false;

    const loadDraft = async () => {
      console.log('[Step1 DEBUG] Draft 로드 시작');
      setIsLoadingDraft(true);
      try {
        const { getDraftSubmission } = await import('@/lib/firebase/submissions');
        console.log('[Step1 DEBUG] getDraftSubmission 호출:', { participantId: participant.id, cohortId, submissionDate });
        const draft = await getDraftSubmission(participant.id, cohortId, submissionDate || undefined);
        console.log('[Step1 DEBUG] Draft 로드 결과:', draft);
        if (cancelled) return;

        if (draft) {
          if (draft.isDailyRetrospective) {
            setIsDailyRetrospective(true);
          } else if (draft.bookImageUrl) {
            try {
              const file = await createFileFromUrl(draft.bookImageUrl);
              if (!cancelled) {
                setImageFile(file, draft.bookImageUrl, draft.bookImageUrl);
                setImageStorageUrl(draft.bookImageUrl);
              }
            } catch {
              if (!cancelled) {
                setImageFile(null, draft.bookImageUrl, draft.bookImageUrl);
                setImageStorageUrl(draft.bookImageUrl);
              }
            }
          }
          if (draft.isEBook && !cancelled) {
            setIsEBook(true);
          }
        }
      } catch (error) {
        if (!cancelled) logger.error('Draft 로드 실패:', error);
      } finally {
        // cancelled 여부와 관계없이 로딩 상태는 해제해야 함
        setIsLoadingDraft(false);
        console.log('[Step1 DEBUG] Draft 로드 완료, isLoadingDraft: false');
      }
    };

    loadDraft();
    return () => { cancelled = true; };
  }, [participant, cohortId, existingSubmissionId, imageFile, setImageFile, setImageStorageUrl, setIsEBook, setIsDailyRetrospective, submissionDate]);

  // 기존 제출물 불러오기 (수정 모드)
  useEffect(() => {
    if (!participant || !cohortId || !existingSubmissionId || hasLoadedExistingRef.current) return;

    hasLoadedExistingRef.current = true; // 무한 재시도 방지: 먼저 설정
    let cancelled = false;

    const loadExistingSubmission = async () => {
      setIsLoadingDraft(true);
      try {
        const { getSubmissionById } = await import('@/lib/firebase/submissions');
        const submission = await getSubmissionById(existingSubmissionId);
        if (!submission || cancelled) return;

        if (submission.isDailyRetrospective) {
          setIsDailyRetrospective(true);
        } else if (submission.bookImageUrl) {
          try {
            const file = await createFileFromUrl(submission.bookImageUrl);
            if (!cancelled) setImageFile(file, submission.bookImageUrl, submission.bookImageUrl);
          } catch {
            if (!cancelled) setImageFile(null, submission.bookImageUrl, submission.bookImageUrl);
          }
          if (!cancelled) setImageStorageUrl(submission.bookImageUrl);
        }

        if (!cancelled) {
          if (submission.isEBook) setIsEBook(true);

          if (submission.bookTitle) {
            if (submission.bookAuthor || submission.bookCoverUrl || submission.bookDescription) {
              setSelectedBook({
                title: submission.bookTitle,
                author: submission.bookAuthor || '',
                image: submission.bookCoverUrl || '',
                description: submission.bookDescription || '',
                isbn: '', publisher: '', pubdate: '', link: '', discount: '',
              });
              setManualTitle('');
            } else {
              setSelectedBook(null);
              setManualTitle(submission.bookTitle);
            }
          }

          if (submission.review) setReview(submission.review);
          if (submission.dailyAnswer) setDailyAnswer(submission.dailyAnswer);
        }
      } catch {
        if (!cancelled) toast({ title: '제출물 불러오기 실패', description: '다시 시도해주세요.', variant: 'destructive' });
      } finally {
        if (!cancelled) setIsLoadingDraft(false);
      }
    };

    loadExistingSubmission();
    return () => { cancelled = true; };
  }, [participant, cohortId, existingSubmissionId, setImageFile, setImageStorageUrl, setSelectedBook, setManualTitle, setReview, setDailyAnswer, setIsEBook, setIsDailyRetrospective, toast]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const validation = validateImageFile(file, SUBMISSION_VALIDATION.MAX_IMAGE_SIZE / (1024 * 1024));
      if (!validation.valid) {
        toast({ title: '파일 검증 실패', description: validation.error, variant: 'destructive' });
        return;
      }

      const processedFile = await compressImageIfNeeded(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(processedFile, reader.result as string);
        setIsEBook(false);
        setIsDailyRetrospective(false); // 이미지 선택 시 회고 해제
      };
      reader.onerror = () => {
        setIsProcessing(false);
        toast({ title: '이미지 로드 실패', description: '이미지를 불러올 수 없습니다.', variant: 'destructive' });
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      toast({ title: '이미지 처리 실패', description: error instanceof Error ? error.message : '다시 시도해주세요.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null, null);
    setImageStorageUrl(null);
  };

  const handleDailyRetrospective = async () => {
    if (!participantId || !participationCode) {
      toast({ title: '세션 정보가 없습니다', variant: 'destructive' });
      return;
    }

    setIsDailyRetrospective(true);
    // 이미지/전자책 초기화
    setImageFile(null, null);
    setImageStorageUrl(null);
    setIsEBook(false);

    // 바로 Step 2로 이동 (임시저장은 안함 - Step 2에서 입력 시 자동저장됨)
    router.push(`${appRoutes.submitStep2}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
  };

  const handleNext = async () => {
    if (isDailyRetrospective) {
      handleDailyRetrospective();
      return;
    }

    if (!imageFile && !imageStorageUrl && !isEBook) {
      toast({ title: '이미지를 선택해주세요', description: '책의 마지막 페이지를 촬영하거나 전자책 옵션을 선택해주세요.', variant: 'destructive' });
      return;
    }

    if (!participantId || !participationCode) {
      toast({ title: '세션 정보가 없습니다', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      let bookImageUrl = imageStorageUrl;

      if (!isEBook && !bookImageUrl && imageFile) {
        bookImageUrl = await uploadReadingImage(imageFile, participationCode, cohortId);
        setImageStorageUrl(bookImageUrl);
      }

      if (bookImageUrl) clearImagePreview();

      await saveDraft(participantId, participationCode, {
        ...(bookImageUrl && { bookImageUrl }),
        isEBook,
        isDailyRetrospective: false, // 일반 제출임
        ...(cohortId && { cohortId }),
      }, participant?.name, submissionDate || undefined);

      router.push(`${appRoutes.submitStep2}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    } catch (error) {
      toast({ title: '처리 실패', description: error instanceof Error ? error.message : '다시 시도해주세요.', variant: 'destructive' });
      setIsProcessing(false);
    }
  };

  if (sessionLoading || !participant || !cohortId) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <SubmissionLayout
      mainPaddingBottom={mainPaddingBottom}
      footerPaddingBottom={footerPaddingBottom}
      footer={
        <UnifiedButton
          onClick={handleNext}
          disabled={(!imageFile && !isEBook && !isDailyRetrospective) || isProcessing}
          loading={isProcessing}
          loadingText="처리 중..."
        >
          다음
        </UnifiedButton>
      }
    >
      <div className="space-y-3">
        <h2 className="text-lg font-bold">읽은 책의 마지막 페이지를<br />업로드해 주세요</h2>
        <p className="text-sm text-muted-foreground">사진은 제출하면 다시 수정할 수 없어요</p>
      </div>

      {/* 이미지 업로드 영역 */}
      {!imagePreview ? (
        <label
          htmlFor="book-image"
          className={`flex flex-col items-center justify-center aspect-4/3 w-full border-2 border-dashed rounded-2xl transition-colors ${isEBook || isDailyRetrospective ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'border-blue-200 bg-blue-50/30 cursor-pointer hover:border-gray-400'
            }`}
        >
          <Upload className={`h-12 w-12 mb-4 ${isEBook || isDailyRetrospective ? 'text-gray-300' : 'text-blue-400'}`} />
          <p className={`text-sm font-medium ${isEBook || isDailyRetrospective ? 'text-gray-400' : 'text-gray-700'}`}>
            {isEBook ? '전자책은 표지 사진으로 대체됩니다' : isDailyRetrospective ? '회고 작성 중' : '이미지를 업로드하려면 클릭하세요'}
          </p>
          {!isEBook && !isDailyRetrospective && <p className="text-xs text-gray-500 mt-2">최대 50MB, JPG/PNG/HEIC</p>}
          <input id="book-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={isProcessing || isEBook || isDailyRetrospective} />
        </label>
      ) : (
        <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border-2 border-blue-200">
          <Image src={imagePreview} alt="책 마지막 페이지" width={800} height={600} className="w-full h-full object-contain" />
          <button type="button" onClick={handleRemoveImage} className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black rounded-full transition-colors" aria-label="이미지 제거">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      )}

      {/* 전자책 체크박스 */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="ebook-check"
          checked={isEBook}
          onCheckedChange={(checked) => {
            setIsEBook(checked === true);
            if (checked === true) {
              handleRemoveImage();
              setIsDailyRetrospective(false);
            }
          }}
        />
        <Label htmlFor="ebook-check" className="text-sm font-medium leading-none cursor-pointer">
          전자책으로 읽었어요 (표지 사진으로 대체)
        </Label>
      </div>

      {/* 구분선 - 2024.12.18 잠시 숨김 (회고 버튼과 함께) */}
      {/* <div className="relative py-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs font-medium text-gray-400">
          <span className="bg-white px-2">또는</span>
        </div>
      </div> */}

      {/* 하루 회고 버튼 - 2024.12.17 잠시 숨김 (아직 오픈 전) */}
      {/* <button
        type="button"
        onClick={handleDailyRetrospective}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">오늘 독서를 못하셨나요?</h3>
          <p className="text-xs text-gray-500">하루 회고 작성하러 가기</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </button> */}
    </SubmissionLayout>
  );
}

export default function Step1Page() {
  return <Step1Content />;
}
