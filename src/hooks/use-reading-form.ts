'use client';

import { useReducer, useCallback } from 'react';
import type { DailyQuestion } from '@/constants/daily-questions';

/**
 * 독서 인증 폼 상태
 */
export type ReadingFormState = {
  // 이미지
  image: {
    file: File | null;
    preview: string;
  };
  // 책 정보
  bookInfo: {
    title: string;
    author: string;
    coverUrl: string;
    description: string;
  };
  // 독서 내용
  content: {
    review: string;
    dailyAnswer: string;
  };
  // 일일 질문
  dailyQuestion: DailyQuestion | null;
  // UI 상태
  ui: {
    uploading: boolean;
    uploadStep: string;
    isLoadingBookTitle: boolean;
    isAutoFilled: boolean;
    alreadySubmittedToday: boolean;
  };
};

/**
 * 폼 액션 타입
 */
export type ReadingFormAction =
  | { type: 'SET_IMAGE'; payload: { file: File; preview: string } }
  | { type: 'REMOVE_IMAGE' }
  | { type: 'SET_BOOK_INFO'; payload: Partial<ReadingFormState['bookInfo']> }
  | { type: 'RESET_BOOK_METADATA' }
  | { type: 'SET_REVIEW'; payload: string }
  | { type: 'SET_DAILY_ANSWER'; payload: string }
  | { type: 'SET_DAILY_QUESTION'; payload: DailyQuestion | null }
  | { type: 'SET_UI'; payload: Partial<ReadingFormState['ui']> }
  | { type: 'SET_AUTO_FILLED'; payload: boolean }
  | { type: 'RESTORE_DRAFT'; payload: Partial<ReadingFormState> }
  | { type: 'RESET_FORM' };

/**
 * 초기 상태
 */
const initialState: ReadingFormState = {
  image: { file: null, preview: '' },
  bookInfo: { title: '', author: '', coverUrl: '', description: '' },
  content: { review: '', dailyAnswer: '' },
  dailyQuestion: null,
  ui: {
    uploading: false,
    uploadStep: '',
    isLoadingBookTitle: false,
    isAutoFilled: false,
    alreadySubmittedToday: false,
  },
};

/**
 * 폼 리듀서
 */
function readingFormReducer(state: ReadingFormState, action: ReadingFormAction): ReadingFormState {
  switch (action.type) {
    case 'SET_IMAGE':
      return {
        ...state,
        image: action.payload,
      };

    case 'REMOVE_IMAGE':
      return {
        ...state,
        image: { file: null, preview: '' },
      };

    case 'SET_BOOK_INFO':
      return {
        ...state,
        bookInfo: { ...state.bookInfo, ...action.payload },
      };

    case 'RESET_BOOK_METADATA':
      return {
        ...state,
        bookInfo: {
          ...state.bookInfo,
          author: '',
          coverUrl: '',
          description: '',
        },
        ui: {
          ...state.ui,
          isAutoFilled: false,
        },
      };

    case 'SET_REVIEW':
      return {
        ...state,
        content: { ...state.content, review: action.payload },
      };

    case 'SET_DAILY_ANSWER':
      return {
        ...state,
        content: { ...state.content, dailyAnswer: action.payload },
      };

    case 'SET_DAILY_QUESTION':
      return {
        ...state,
        dailyQuestion: action.payload,
      };

    case 'SET_UI':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };

    case 'SET_AUTO_FILLED':
      return {
        ...state,
        ui: { ...state.ui, isAutoFilled: action.payload },
      };

    case 'RESTORE_DRAFT':
      return {
        ...state,
        ...action.payload,
      };

    case 'RESET_FORM':
      return {
        ...initialState,
        // 일일 질문은 유지
        dailyQuestion: state.dailyQuestion,
      };

    default:
      return state;
  }
}

/**
 * 독서 인증 폼 상태 관리 훅
 *
 * 17개의 useState를 useReducer로 통합
 */
export function useReadingForm() {
  const [state, dispatch] = useReducer(readingFormReducer, initialState);

  // 이미지 설정
  const setImage = useCallback((file: File, preview: string) => {
    dispatch({ type: 'SET_IMAGE', payload: { file, preview } });
  }, []);

  // 이미지 제거
  const removeImage = useCallback(() => {
    dispatch({ type: 'REMOVE_IMAGE' });
  }, []);

  // 책 정보 설정
  const setBookInfo = useCallback((info: Partial<ReadingFormState['bookInfo']>) => {
    dispatch({ type: 'SET_BOOK_INFO', payload: info });
  }, []);

  // 책 메타데이터 초기화
  const resetBookMetadata = useCallback(() => {
    dispatch({ type: 'RESET_BOOK_METADATA' });
  }, []);

  // 리뷰 설정
  const setReview = useCallback((review: string) => {
    dispatch({ type: 'SET_REVIEW', payload: review });
  }, []);

  // 일일 답변 설정
  const setDailyAnswer = useCallback((answer: string) => {
    dispatch({ type: 'SET_DAILY_ANSWER', payload: answer });
  }, []);

  // 일일 질문 설정
  const setDailyQuestion = useCallback((question: DailyQuestion | null) => {
    dispatch({ type: 'SET_DAILY_QUESTION', payload: question });
  }, []);

  // UI 상태 설정
  const setUI = useCallback((ui: Partial<ReadingFormState['ui']>) => {
    dispatch({ type: 'SET_UI', payload: ui });
  }, []);

  // 자동 채움 플래그 설정
  const setAutoFilled = useCallback((value: boolean) => {
    dispatch({ type: 'SET_AUTO_FILLED', payload: value });
  }, []);

  // 임시 저장 내용 복원
  const restoreDraft = useCallback((draft: Partial<ReadingFormState>) => {
    dispatch({ type: 'RESTORE_DRAFT', payload: draft });
  }, []);

  // 폼 초기화
  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  return {
    state,
    setImage,
    removeImage,
    setBookInfo,
    resetBookMetadata,
    setReview,
    setDailyAnswer,
    setDailyQuestion,
    setUI,
    setAutoFilled,
    restoreDraft,
    resetForm,
  };
}
