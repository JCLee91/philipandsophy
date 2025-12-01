'use client';

import { create } from 'zustand';
import type { NaverBook } from '@/lib/naver-book-api';

interface SubmissionFlowState {
  // Step 1: 이미지 업로드
  imageFile: File | null;
  imagePreview: string | null;
  imageStorageUrl: string | null;

  // Step 2: 책 정보 + 감상평
  selectedBook: NaverBook | null;
  manualTitle: string;
  review: string; // 감상평

  // Step 3: 질문 답변
  dailyAnswer: string; // 오늘의 질문 답변

  // 메타 정보
  participantId: string | null;
  participationCode: string | null;
  cohortId: string | null;
  existingSubmissionId: string | null; // 수정 모드일 때
  submissionDate: string | null; // Step 1 진입 시 결정된 제출 날짜 (2시 마감 기준)

  // Actions
  setImageFile: (file: File | null, preview: string | null, storageUrl?: string | null) => void;
  // 💡 NEW: Clear only the memory-heavy preview if URL exists
  clearImagePreview: () => void;
  setSelectedBook: (book: NaverBook | null) => void;
  setManualTitle: (title: string) => void;
  setReview: (review: string) => void;
  setDailyAnswer: (answer: string) => void;
  setMetaInfo: (participantId: string, participationCode: string, cohortId: string, existingSubmissionId?: string) => void;
  setImageStorageUrl: (url: string | null) => void;
  setSubmissionDate: (date: string | null) => void;

  isEBook: boolean;
  setIsEBook: (isEBook: boolean) => void;

  reset: () => void;
}

const initialState = {
  imageFile: null,
  imagePreview: null,
  imageStorageUrl: null,
  selectedBook: null,
  manualTitle: '',
  review: '',
  dailyAnswer: '',
  participantId: null,
  participationCode: null,
  cohortId: null,
  existingSubmissionId: null,
  submissionDate: null,
  isEBook: false,
};

export const useSubmissionFlowStore = create<SubmissionFlowState>((set) => ({
  ...initialState,

  setImageFile: (file, preview, storageUrl = null) =>
    set({ imageFile: file, imagePreview: preview, imageStorageUrl: storageUrl ?? null }),

  clearImagePreview: () => set({ imagePreview: null }),

  setSelectedBook: (book) => set({ selectedBook: book }),

  setManualTitle: (title) => set({ manualTitle: title }),

  setReview: (review) => set({ review }),

  setDailyAnswer: (answer) => set({ dailyAnswer: answer }),

  setMetaInfo: (participantId, participationCode, cohortId, existingSubmissionId) =>
    set({ participantId, participationCode, cohortId, existingSubmissionId }),

  setImageStorageUrl: (url) => set({ imageStorageUrl: url }),

  setSubmissionDate: (date) => set({ submissionDate: date }),

  isEBook: false,
  setIsEBook: (isEBook: boolean) => set({ isEBook }),

  reset: () => set(initialState),
}));
