'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { validateImageFile, compressImageIfNeeded } from '@/lib/image-validation';
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

export const dynamic = 'force-dynamic';

function Step1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const existingSubmissionId = searchParams.get('edit');

  const { participant, isLoading: sessionLoading } = useAuth();
  const { toast } = useToast();

  const { imageFile, imagePreview, setImageFile, setMetaInfo, participantId, participationCode } = useSubmissionFlowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // 메타 정보 설정
  useEffect(() => {
    if (participant && cohortId) {
      setMetaInfo(participant.id, participant.id, cohortId, existingSubmissionId || undefined);
    }
  }, [participant, cohortId, existingSubmissionId, setMetaInfo]);

  // 임시저장 자동 불러오기
  useEffect(() => {
    if (!participant || !cohortId || existingSubmissionId || imageFile) return;

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const { getDraftSubmission } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participant.id, cohortId);

        if (draft?.bookImageUrl) {
          setImageFile(null, draft.bookImageUrl);
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
  }, [participant, cohortId, existingSubmissionId, imageFile, setImageFile, toast]);

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
  };

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

  const handleNext = async () => {
    if (!imageFile) {
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
      const bookImageUrl = await uploadReadingImage(imageFile, participationCode);

      // draft 저장은 백그라운드에서 진행 (페이지 이동을 블로킹하지 않음)
      saveDraft(participantId, participationCode, { bookImageUrl }).catch((err) => {
        // 실패해도 사용자에게는 알리지 않음 (Step2에서 다시 저장됨)
        console.error('Background draft save failed:', err);
      });

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

        <main className="app-main-content flex-1 overflow-y-auto pt-[57px]">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
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
                className="flex flex-col items-center justify-center min-h-[500px] border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:border-blue-300 transition-colors bg-blue-50/30"
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
              <div className="relative rounded-2xl overflow-hidden border-2 border-blue-200">
                <Image
                  src={imagePreview}
                  alt="책 마지막 페이지"
                  width={600}
                  height={800}
                  className="w-full h-auto"
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
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-4 pt-4 pb-[60px]">
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
