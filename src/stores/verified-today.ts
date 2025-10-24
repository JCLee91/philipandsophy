'use client';

import { create } from 'zustand';
import { useEffect } from 'react';
import { subscribeTodayVerified } from '@/lib/firebase';
import { getTodayString } from '@/lib/date-utils';
import { APP_CONSTANTS } from '@/constants/app';

interface VerifiedTodayState {
  verifiedIds: Set<string>;
  isLoading: boolean;
  currentDate: string;
  subscriberCount: number;
  unsubscribe: (() => void) | null;
  dateCheckInterval: ReturnType<typeof setInterval> | null;

  // Actions
  subscribe: () => void;
  unsubscribeStore: () => void;
  checkDateChange: () => void;
}

/**
 * 오늘 독서 인증 완료 참가자 ID 목록 전역 상태 관리
 * - 여러 컴포넌트에서 동일 Firebase 구독 공유 (성능 최적화)
 * - 구독자 카운팅으로 자동 구독/해제 관리
 */
export const useVerifiedTodayStore = create<VerifiedTodayState>((set, get) => ({
  verifiedIds: new Set(),
  isLoading: true,
  currentDate: getTodayString(), // KST 타임존 사용
  subscriberCount: 0,
  unsubscribe: null,
  dateCheckInterval: null,

  // 구독 시작 (첫 번째 컴포넌트 마운트 시)
  subscribe: () => {
    const state = get();
    const newCount = state.subscriberCount + 1;

    set({ subscriberCount: newCount });

    // 첫 번째 구독자일 때만 Firebase 구독 시작
    if (newCount === 1) {
      const currentDate = state.currentDate;

      // Firebase 실시간 구독
      console.log('🔍 [VerifiedToday] 구독 시작:', { currentDate });
      const unsubscribeFn = subscribeTodayVerified((ids) => {
        console.log('🔍 [VerifiedToday] 데이터 수신:', {
          date: currentDate,
          count: ids.size,
          ids: Array.from(ids)
        });
        set({ verifiedIds: ids, isLoading: false });
      }, currentDate);

      // 날짜 체크 인터벌 시작 (1분마다 자정 감지)
      const intervalId = setInterval(() => {
        get().checkDateChange();
      }, APP_CONSTANTS.MIDNIGHT_CHECK_INTERVAL);

      set({
        unsubscribe: unsubscribeFn,
        dateCheckInterval: intervalId,
      });
    }
  },

  // 구독 해제 (컴포넌트 언마운트 시)
  unsubscribeStore: () => {
    const state = get();
    const newCount = Math.max(0, state.subscriberCount - 1);

    set({ subscriberCount: newCount });

    // 마지막 구독자가 떠날 때 Firebase 구독 해제
    if (newCount === 0 && state.unsubscribe) {
      state.unsubscribe();
      if (state.dateCheckInterval) {
        clearInterval(state.dateCheckInterval);
      }
      set({
        unsubscribe: null,
        dateCheckInterval: null,
        isLoading: true,
      });
    }
  },

  // 날짜 변화 체크 (자정 감지)
  checkDateChange: () => {
    const state = get();
    const today = getTodayString(); // KST 타임존 사용

    if (today !== state.currentDate) {
      // 날짜가 바뀌면 기존 구독 해제하고 새로 구독
      if (state.unsubscribe) {
        state.unsubscribe();
      }

      const unsubscribeFn = subscribeTodayVerified((ids) => {
        set({ verifiedIds: ids, isLoading: false });
      }, today);

      set({
        currentDate: today,
        unsubscribe: unsubscribeFn,
        verifiedIds: new Set(),
        isLoading: true,
      });
    }
  },
}));

/**
 * useVerifiedToday hook과 동일한 인터페이스 제공
 * 기존 hook을 대체하여 사용 가능
 */
export function useVerifiedToday() {
  const { verifiedIds, isLoading, subscribe, unsubscribeStore } = useVerifiedTodayStore();

  // 컴포넌트 마운트 시 구독, 언마운트 시 구독 해제
  useEffect(() => {
    subscribe();
    return () => {
      unsubscribeStore();
    };
  }, [subscribe, unsubscribeStore]);

  return { data: verifiedIds, isLoading };
}
