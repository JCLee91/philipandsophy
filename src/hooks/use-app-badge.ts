/**
 * App Badge API Hook
 *
 * 앱이 열리거나 포커스될 때 앱 아이콘의 배지(빨간 숫자)를 자동으로 제거합니다.
 *
 * Features:
 * - 초기 로드 시 배지 제거
 * - 앱 포커스 시 배지 제거
 * - 브라우저 지원 여부 자동 감지
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/clearAppBadge
 */

'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * 앱 배지 자동 제거 훅
 *
 * 사용자가 앱을 열거나 포커스하면 읽지 않은 알림 배지를 제거합니다.
 *
 * @example
 * ```tsx
 * function AppLayout({ children }) {
 *   useAppBadgeClear();
 *   return <div>{children}</div>;
 * }
 * ```
 */
export function useAppBadgeClear() {
  useEffect(() => {
    // Badge API 지원 여부 확인
    if (!('clearAppBadge' in navigator)) {
      return;
    }

    /**
     * 배지 제거 함수
     */
    const clearBadge = async () => {
      try {
        await navigator.clearAppBadge();
      } catch (error) {
        logger.error('Failed to clear app badge', error);
      }
    };

    // 초기 로드 시 배지 제거 (앱 진입 = 알림 확인한 것으로 간주)
    clearBadge();

    // 윈도우 포커스 시 배지 제거 (백그라운드에서 돌아왔을 때)
    window.addEventListener('focus', clearBadge);

    // 클린업
    return () => {
      window.removeEventListener('focus', clearBadge);
    };
  }, []);
}
