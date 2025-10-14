'use client';

import { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UnifiedButton from '@/components/UnifiedButton';
import { useCreateSubmission, useUpdateSubmission, useSubmissionsByParticipant } from '@/hooks/use-submissions';
import { uploadReadingImage, getParticipantById, updateParticipantBookInfo } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getDailyQuestion, type DailyQuestion as DailyQuestionType } from '@/constants/daily-questions';
import BookSearchAutocomplete from '@/components/BookSearchAutocomplete';
import type { NaverBook } from '@/lib/naver-book-api';
import { logger } from '@/lib/logger';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { getTodayString } from '@/lib/date-utils';
import type { ReadingSubmission } from '@/types/database';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useDraftStorage, confirmCloseDialog } from '@/hooks/use-draft-storage';
import { AlertBanner } from '@/components/AlertBanner';
import { useReadingForm } from '@/hooks/use-reading-form';
import { useSimpleImageUpload } from '@/hooks/use-simple-image-upload';
import { ImageUploadSection } from '@/components/reading-submission/ImageUploadSection';
import { ReviewSection } from '@/components/reading-submission/ReviewSection';
import { DailyQuestionSection } from '@/components/reading-submission/DailyQuestionSection';

interface ReadingSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participationCode: string;
  existingSubmission?: ReadingSubmission; // 수정 모드: 기존 제출물
}

export default function ReadingSubmissionDialog({
  open,
  onOpenChange,
  participantId,
  participationCode,
  existingSubmission,
}: ReadingSubmissionDialogProps) {
  useModalCleanup(open);

  const isEditMode = !!existingSubmission;

  // ✅ useReducer 기반 폼 상태 관리 (17개 useState → 1개 useReducer)
  const form = useReadingForm();
  const { state, setBookInfo, setReview, setDailyAnswer, setDailyQuestion, setUI, resetForm, restoreDraft } = form;

  // ✅ 간소화된 이미지 업로드 (88줄 → 20줄)
  const imageUpload = useSimpleImageUpload({
    onUpload: (file, preview) => {
      form.setImage(file, preview);
    },
  });

  const { toast } = useToast();
  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();
  const { data: allSubmissions = [] } = useSubmissionsByParticipant(participantId);

  // Race Condition 방지: atomic flag
  const isSubmittingRef = useRef(false);

  // 임시 저장 (수정 모드에서는 비활성화)
  const draftKey = `reading-draft-${participantId}`;
  const { restore, clear } = useDraftStorage(
    draftKey,
    {
      bookTitle: state.bookInfo.title,
      bookAuthor: state.bookInfo.author,
      bookCoverUrl: state.bookInfo.coverUrl,
      bookDescription: state.bookInfo.description,
      review: state.content.review,
      dailyAnswer: state.content.dailyAnswer,
    },
    !isEditMode // 신규 제출 모드에서만 활성화
  );

  // 다이얼로그가 열릴 때 데이터 로드
  useEffect(() => {
    if (open) {
      // 수정 모드: 기존 데이터 pre-fill
      if (isEditMode && existingSubmission) {
        setBookInfo({
          title: existingSubmission.bookTitle || '',
          author: existingSubmission.bookAuthor || '',
          coverUrl: existingSubmission.bookCoverUrl || '',
          description: existingSubmission.bookDescription || '',
        });
        setReview(existingSubmission.review || '');
        setDailyAnswer(existingSubmission.dailyAnswer || '');
        imageUpload.setImagePreview(existingSubmission.bookImageUrl || '');
        form.setAutoFilled(true);

        // 기존 질문 로드
        if (existingSubmission.dailyQuestion) {
          setDailyQuestion({
            question: existingSubmission.dailyQuestion,
            category: '가치관 & 삶', // 기본 카테고리
          });
        }

        setUI({ alreadySubmittedToday: false }); // 수정 모드에서는 경고 표시 안 함
        return; // 수정 모드에서는 추가 로드 불필요
      }

      // 신규 제출 모드: 기존 로직
      const question = getDailyQuestion();
      setDailyQuestion(question);

      // 오늘 이미 제출했는지 확인
      const today = getTodayString();
      const todaySubmission = allSubmissions.find(
        (sub) => sub.submissionDate === today
      );
      setUI({ alreadySubmittedToday: !!todaySubmission });

      // 임시 저장된 내용 복원
      const draft = restore();
      if (draft) {
        restoreDraft({
          bookInfo: {
            title: draft.bookTitle || '',
            author: draft.bookAuthor || '',
            coverUrl: draft.bookCoverUrl || '',
            description: draft.bookDescription || '',
          },
          content: {
            review: draft.review || '',
            dailyAnswer: draft.dailyAnswer || '',
          },
        });

        logger.info('임시 저장된 내용 복원됨');
        toast({
          title: '작성 중이던 내용을 불러왔습니다',
          description: '이전에 작성하던 내용을 복원했습니다.',
        });

        // 복원 후에는 현재 책 정보를 불러오지 않음 (덮어쓰기 방지)
        return;
      }

      // Race condition 방지를 위한 cleanup flag
      let isCancelled = false;

      // 참가자의 현재 책 정보 로드 (제목 + 저자 + 표지)
      const loadCurrentBook = async () => {
        setUI({ isLoadingBookTitle: true });
        try {
          const participant = await getParticipantById(participantId);

          // 컴포넌트가 언마운트되었는지 확인
          if (isCancelled) return;

          if (participant?.currentBookTitle) {
            setBookInfo({
              title: participant.currentBookTitle,
              author: participant.currentBookAuthor || '',
              coverUrl: participant.currentBookCoverUrl || '',
            });
            form.setAutoFilled(true);
          }
        } catch (error) {
          if (isCancelled) return;

          logger.error('Failed to load current book info:', error);
          toast({
            title: '책 정보 로드 실패',
            description: '이전 독서 정보를 불러오지 못했습니다. 새로 검색해주세요.',
            variant: 'destructive',
          });
        } finally {
          if (!isCancelled) {
            setUI({ isLoadingBookTitle: false });
          }
        }
      };

      loadCurrentBook();

      // Cleanup: 컴포넌트 언마운트 시 flag 설정
      return () => {
        isCancelled = true;
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, participantId, allSubmissions, isEditMode, existingSubmission, restore, toast, setBookInfo, setReview, setDailyAnswer, setDailyQuestion, setUI, form, restoreDraft]);
  // Note: imageUpload는 의존성에서 제외 (effect 내부에서만 호출, 트리거 조건 아님)

  // ✅ 이미지 처리 로직은 useSimpleImageUpload로 이동 (88줄 → 0줄)

  // 책 정보 변경 확인 헬퍼 함수
  const confirmMetadataReset = (): boolean => {
    return window.confirm(
      '책 정보를 수정하면 저자와 표지가 초기화됩니다.\n계속하시겠습니까?'
    );
  };

  const handleBookTitleChange = (value: string) => {
    // Early return: 빈 값
    if (value === '') {
      setBookInfo({ title: value });
      return;
    }

    // Early return: 메타데이터 있고 사용자가 취소
    const hasMetadata = state.bookInfo.author && state.bookInfo.coverUrl;
    const isChanging = value !== state.bookInfo.title;

    if (hasMetadata && isChanging && !confirmMetadataReset()) {
      return;
    }

    // 책 제목 업데이트 + 메타데이터 초기화
    setBookInfo({ title: value });
    form.resetBookMetadata();
  };

  const handleBookSelect = (book: NaverBook) => {
    setBookInfo({
      title: book.title,
      author: book.author,
      coverUrl: book.image,
      description: book.description,
    });
    form.setAutoFilled(false);
  };

  const handleClearTitle = (): boolean => {
    // Early return: 메타데이터 있고 사용자가 취소
    const hasMetadata = state.bookInfo.author || state.bookInfo.coverUrl;

    if (hasMetadata && !confirmMetadataReset()) {
      return false;
    }

    // 책 정보 전체 초기화
    setBookInfo({ title: '', author: '', coverUrl: '', description: '' });
    return true;
  };

  const handleSubmit = async () => {
    // ✅ Atomic check-and-set (Race Condition 방지)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setUI({ uploading: true });

    try {
      // ========== 수정 모드 ==========
      if (isEditMode && existingSubmission) {
        setUI({ uploadStep: '수정 중...' });

        await updateSubmission.mutateAsync({
          id: existingSubmission.id,
          data: {
            review: state.content.review.trim(),
            dailyAnswer: state.content.dailyAnswer.trim(),
          },
        });

        toast({
          title: '독서 인증 수정 완료 ✅',
          description: '수정 내용이 저장되었습니다.',
        });

        // 임시 저장 내용 삭제
        clear();

        onOpenChange(false);
        return;
      }

      // ========== 신규 제출 모드 ==========

      const trimmedBookTitle = state.bookInfo.title.trim();

      // 검증
      if (!state.image.file) {
        throw new Error('책 사진을 선택해주세요');
      }

      // 1️⃣ 책 정보 업데이트 (빠름, 실패 시 조기 종료)
      setUI({ uploadStep: '책 정보 저장 중...' });

      await updateParticipantBookInfo(
        participantId,
        trimmedBookTitle,
        state.bookInfo.author?.trim() || undefined,
        state.bookInfo.coverUrl || undefined
      );

      // 2️⃣ 이미지 업로드 (느림, 하지만 DB는 이미 저장 완료)
      setUI({ uploadStep: '이미지 업로드 중...' });

      let bookImageUrl: string;
      try {
        bookImageUrl = await uploadReadingImage(state.image.file, participationCode);
      } catch (uploadError) {
        // Firebase Storage specific error handling
        if (uploadError instanceof Error) {
          if (uploadError.message.includes('storage/quota-exceeded')) {
            throw new Error('스토리지 용량이 초과되었습니다. 관리자에게 문의하세요.');
          }
          if (uploadError.message.includes('storage/unauthorized')) {
            throw new Error('업로드 권한이 없습니다. 다시 시도해주세요.');
          }
          if (uploadError.message.includes('storage/canceled')) {
            throw new Error('업로드가 취소되었습니다.');
          }
        }
        throw uploadError; // Re-throw for generic handler
      }

      // 3️⃣ 제출 생성 (빠름)
      setUI({ uploadStep: '제출물 저장 중...' });

      await createSubmission.mutateAsync({
          participantId,
          participationCode,
          bookTitle: trimmedBookTitle,
          ...(state.bookInfo.author.trim() && { bookAuthor: state.bookInfo.author.trim() }),
          ...(state.bookInfo.coverUrl && { bookCoverUrl: state.bookInfo.coverUrl }),
          ...(state.bookInfo.description.trim() && { bookDescription: state.bookInfo.description.trim() }),
          bookImageUrl,
          review: state.content.review.trim(),
          dailyQuestion: state.dailyQuestion?.question || '',
          dailyAnswer: state.content.dailyAnswer.trim(),
          submittedAt: Timestamp.now(),
          status: 'approved', // status 필드는 유지 (DB 스키마 호환성)
        });

      toast({
        title: '독서 인증 완료 ✅',
        description: '오늘의 서재에서 다른 멤버들의 프로필을 확인해보세요!',
      });

      // 임시 저장 내용 삭제
      clear();

      // 폼 초기화
      resetForm();
      imageUpload.removeImage();
      onOpenChange(false);
    } catch (error) {
      logger.error('Submission error:', error);

      // 사용자 친화적인 에러 메시지
      const errorMessage = error instanceof Error
        ? error.message
        : '독서 인증 제출 중 오류가 발생했습니다. 다시 시도해주세요.';

      toast({
        title: '제출 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUI({ uploading: false, uploadStep: '' });
      isSubmittingRef.current = false; // ✅ Flag 해제
    }
  };

  // 다이얼로그 닫기 handler (작성 중 확인)
  const handleDialogClose = (newOpen: boolean) => {
    // 닫으려고 할 때만 확인 (수정 모드나 제출 완료 후는 제외)
    if (!newOpen && !isEditMode) {
      const hasContent =
        state.bookInfo.title.trim().length > 0 ||
        state.content.review.trim().length > 0 ||
        state.content.dailyAnswer.trim().length > 0;
      if (!confirmCloseDialog(hasContent)) {
        return; // 사용자가 취소하면 닫지 않음
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl h-full sm:h-[90vh] flex flex-col gap-0 reading-dialog-ios-safe">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditMode ? '독서 인증 수정하기' : '독서 인증하기'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? '리뷰와 답변을 수정할 수 있습니다. 책 정보와 이미지는 수정할 수 없습니다.'
              : '오늘 읽은 내용을 기록하고 인증해보세요. 모든 항목은 필수입니다.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">

        {/* 오늘 이미 제출한 경우 경고 표시 */}
        {state.ui.alreadySubmittedToday && (
          <AlertBanner
            variant="warning"
            title="오늘은 이미 제출하셨습니다"
            description="독서 인증은 하루에 1회만 가능합니다. 내일 다시 시도해주세요."
          />
        )}

        <div className="space-y-6 pt-4">
          {/* 1. 책 사진 */}
          <ImageUploadSection
            preview={imageUpload.preview}
            isEditMode={isEditMode}
            disabled={state.ui.uploading || state.ui.alreadySubmittedToday}
            onImageSelect={imageUpload.handleImageSelect}
            onImageRemove={() => {
              imageUpload.removeImage();  // UI 미리보기 제거
              form.removeImage();          // 폼 state 제거
            }}
          />

          {/* 2. 책 제목 (자동완성 컴포넌트로 교체) */}
          <BookSearchAutocomplete
            value={state.bookInfo.title}
            onChange={handleBookTitleChange}
            onBookSelect={handleBookSelect}
            disabled={state.ui.uploading || state.ui.isLoadingBookTitle || isEditMode}
            isAutoFilled={state.ui.isAutoFilled}
            onClear={handleClearTitle}
            initialBook={
              state.ui.isAutoFilled && state.bookInfo.title
                ? {
                    title: state.bookInfo.title,
                    author: state.bookInfo.author || '',
                    publisher: '',
                    isbn: '',
                    pubdate: '',
                    image: state.bookInfo.coverUrl || '',
                    link: '',
                    description: '',
                    discount: '',
                  }
                : null
            }
          />

          {/* 3. 간단 감상평 */}
          <ReviewSection
            value={state.content.review}
            onChange={setReview}
            disabled={state.ui.uploading}
          />

          {/* 4. 오늘의 질문 */}
          <DailyQuestionSection
            question={state.dailyQuestion}
            answer={state.content.dailyAnswer}
            onAnswerChange={setDailyAnswer}
            disabled={state.ui.uploading}
          />
        </div>
        </div>

        <DialogFooter className="gap-3 border-t pt-4 px-6 pb-6 flex-shrink-0">
          <UnifiedButton
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={state.ui.uploading}
            size="sm"
          >
            취소
          </UnifiedButton>
          <UnifiedButton
            onClick={handleSubmit}
            disabled={
              isEditMode ? (
                // 수정 모드: 리뷰와 답변만 검증
                state.content.review.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ||
                state.content.dailyAnswer.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH
              ) : (
                // 신규 제출 모드: 모든 필드 검증
                state.ui.alreadySubmittedToday ||
                !state.image.file ||
                !state.bookInfo.title.trim() ||
                state.content.review.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ||
                state.content.dailyAnswer.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH
              )
            }
            loading={state.ui.uploading}
            loadingText={state.ui.uploadStep || (isEditMode ? '수정 중...' : '제출 중...')}
            size="sm"
          >
            {isEditMode ? '수정하기' : (state.ui.alreadySubmittedToday ? '오늘 제출 완료' : '제출하기')}
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>

      {/* Safe Area CSS for iOS PWA - PWA Standalone 모드에서만 적용 */}
      <style jsx global>{`
        /* PWA Standalone 모드에서만 iOS Safe Area 적용 */
        @media (max-width: 640px) and (display-mode: standalone) {
          .reading-dialog-ios-safe {
            /* CSS Custom Properties로 중복 계산 방지 */
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
            --dialog-height: calc(100vh - var(--safe-top) - var(--safe-bottom));

            /* iOS Safe Area 대응 - top/bottom으로 위치 조정 */
            top: var(--safe-top) !important;
            bottom: var(--safe-bottom) !important;
            left: 0 !important;
            right: 0 !important;

            /* 높이를 safe area만큼 감소 */
            height: var(--dialog-height) !important;
            max-height: var(--dialog-height) !important;

            /* 모바일 전체화면 스타일 (!important 불필요) */
            margin: 0;
            border-radius: 0;
          }

          /* iOS 11.2 이전 버전 호환성 */
          @supports (padding-top: constant(safe-area-inset-top)) {
            .reading-dialog-ios-safe {
              --safe-top: constant(safe-area-inset-top);
              --safe-bottom: constant(safe-area-inset-bottom);
            }
          }
        }

        /* Note: 모바일 브라우저(non-standalone)에서는 Radix UI 기본 스타일 사용 */
      `}</style>
    </Dialog>
  );
}
