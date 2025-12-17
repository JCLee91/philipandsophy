'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NaverBook } from '@/lib/naver-book-api';

interface SubmissionFlowState {
  // Hydration 상태
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

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

  isDailyRetrospective: boolean;
  setIsDailyRetrospective: (isDailyRetrospective: boolean) => void;

  reset: () => void;
}

const initialState = {
  _hasHydrated: false,
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
  isDailyRetrospective: false,
};

export const useSubmissionFlowStore = create<SubmissionFlowState>()(
  persist(
    (set) => ({
      ...initialState,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

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

      isDailyRetrospective: false,
      setIsDailyRetrospective: (isDailyRetrospective: boolean) => set({ isDailyRetrospective }),

      reset: () => set({ ...initialState, _hasHydrated: true }), // hydration 상태는 유지
    }),
    {
      name: 'submission-flow-storage',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          sessionStorage.removeItem(name);
        },
      },
      // File 객체는 직렬화할 수 없으므로 제외
      partialize: (state) =>
        ({
          selectedBook: state.selectedBook,
          manualTitle: state.manualTitle,
          review: state.review,
          dailyAnswer: state.dailyAnswer,
          participantId: state.participantId,
          participationCode: state.participationCode,
          cohortId: state.cohortId,
          existingSubmissionId: state.existingSubmissionId,
          submissionDate: state.submissionDate,
          isEBook: state.isEBook,
          isDailyRetrospective: state.isDailyRetrospective,
          imageStorageUrl: state.imageStorageUrl,
          // imageFile, imagePreview는 File/base64라서 제외
        }) as SubmissionFlowState,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
