'use client';

import { useState, useRef, useEffect } from 'react';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { createFileFromUrl } from '@/lib/image-validation';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface UseSubmissionDraftOptions {
  participantId: string | null;
  cohortId: string | null;
  existingSubmissionId: string | null;
  submissionDate: string | null;
}

/**
 * Submit Step 공통 Draft/기존 제출물 불러오기 훅
 */
export function useSubmissionDraft({
  participantId,
  cohortId,
  existingSubmissionId,
  submissionDate,
}: UseSubmissionDraftOptions) {
  const { toast } = useToast();
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const {
    imageFile,
    imageStorageUrl,
    setImageFile,
    setImageStorageUrl,
    setSelectedBook,
    setManualTitle,
    setReview,
    setDailyAnswer,
    setIsEBook,
    setSubmissionDate,
  } = useSubmissionFlowStore();

  const hasLoadedDraftRef = useRef(false);
  const hasLoadedExistingRef = useRef(false);

  // 임시저장 자동 불러오기 (새 제출 시)
  const loadDraft = async () => {
    if (!participantId || !cohortId || existingSubmissionId || hasLoadedDraftRef.current) {
      return null;
    }

    hasLoadedDraftRef.current = true;
    setIsLoadingDraft(true);

    try {
      const { getDraftSubmission } = await import('@/lib/firebase/submissions');
      const draft = await getDraftSubmission(participantId, cohortId, submissionDate || undefined);
      return draft;
    } catch (error) {
      logger.error('[useSubmissionDraft] Draft 로드 실패:', error);
      return null;
    } finally {
      setIsLoadingDraft(false);
    }
  };

  // 기존 제출물 불러오기 (수정 모드)
  const loadExistingSubmission = async () => {
    if (!existingSubmissionId || hasLoadedExistingRef.current) {
      return null;
    }

    setIsLoadingDraft(true);

    try {
      const { getSubmissionById } = await import('@/lib/firebase/submissions');
      const submission = await getSubmissionById(existingSubmissionId);

      if (!submission) return null;

      hasLoadedExistingRef.current = true;

      // 이미지 복원
      if (submission.bookImageUrl && !imageStorageUrl) {
        try {
          const file = await createFileFromUrl(submission.bookImageUrl);
          setImageFile(file, submission.bookImageUrl, submission.bookImageUrl);
        } catch {
          setImageFile(null, submission.bookImageUrl, submission.bookImageUrl);
        }
        setImageStorageUrl(submission.bookImageUrl);
      }

      // 전자책 여부
      if (submission.isEBook) {
        setIsEBook(true);
      }

      // 책 정보 복원
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

      // 감상평 복원
      if (submission.review) {
        setReview(submission.review);
      }

      // 일일 답변 복원
      if (submission.dailyAnswer) {
        setDailyAnswer(submission.dailyAnswer);
      }

      // 제출 날짜 복원 (수정 모드)
      if (submission.submissionDate) {
        setSubmissionDate(submission.submissionDate);
      }

      return submission;
    } catch (error) {
      toast({
        title: '제출물 불러오기 실패',
        description: '이전 제출을 불러오지 못했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoadingDraft(false);
    }
  };

  // Draft에서 이미지 복원
  const restoreImageFromDraft = async (bookImageUrl: string) => {
    if (imageFile || !bookImageUrl) return;

    try {
      const file = await createFileFromUrl(bookImageUrl);
      setImageFile(file, bookImageUrl, bookImageUrl);
      setImageStorageUrl(bookImageUrl);
    } catch {
      // 이미지 복원 실패 시 URL만 설정
      setImageFile(null, bookImageUrl, bookImageUrl);
      setImageStorageUrl(bookImageUrl);
    }
  };

  // Draft에서 책 정보 복원
  const restoreBookFromDraft = (draft: {
    bookTitle?: string;
    bookAuthor?: string;
    bookCoverUrl?: string;
    bookDescription?: string;
  }) => {
    if (!draft.bookTitle) return false;

    if (draft.bookAuthor && draft.bookCoverUrl) {
      setSelectedBook({
        title: draft.bookTitle,
        author: draft.bookAuthor,
        image: draft.bookCoverUrl,
        description: draft.bookDescription || '',
        isbn: '',
        publisher: '',
        pubdate: '',
        link: '',
        discount: '',
      });
    } else {
      setManualTitle(draft.bookTitle);
    }

    return true;
  };

  // Refs 리셋 (컴포넌트 언마운트 시)
  const resetLoadedRefs = () => {
    hasLoadedDraftRef.current = false;
    hasLoadedExistingRef.current = false;
  };

  return {
    isLoadingDraft,
    setIsLoadingDraft,
    loadDraft,
    loadExistingSubmission,
    restoreImageFromDraft,
    restoreBookFromDraft,
    resetLoadedRefs,
    hasLoadedDraftRef,
    hasLoadedExistingRef,
  };
}
