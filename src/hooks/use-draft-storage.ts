'use client';

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * localStorage 기반 임시 저장 훅
 *
 * 다이얼로그 작성 중 갑자기 닫히거나 로그아웃되어도 내용 복원 가능
 *
 * @param key - localStorage 키 (고유해야 함)
 * @param data - 저장할 데이터 객체
 * @param enabled - 저장 활성화 여부 (기본: true)
 * @returns { restore, clear } - 복원 및 삭제 함수
 */
export function useDraftStorage<T extends Record<string, any>>(
  key: string,
  data: T,
  enabled: boolean = true
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // 자동 저장 (debounce 1초)
  useEffect(() => {
    // 초기 마운트 시에는 저장하지 않음 (복원된 데이터 덮어쓰기 방지)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;

    // 이전 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 1초 후 저장 (debounce)
    timeoutRef.current = setTimeout(() => {
      try {
        // 빈 값만 있는지 확인 (모든 필드가 빈 문자열/null/undefined)
        const hasContent = Object.values(data).some((value) => {
          if (typeof value === 'string') return value.trim().length > 0;
          return value !== null && value !== undefined;
        });

        if (hasContent) {
          localStorage.setItem(key, JSON.stringify(data));
          logger.debug('Draft auto-saved', { key });
        } else {
          // 내용이 없으면 삭제
          localStorage.removeItem(key);
        }
      } catch (error) {
        logger.error('Draft save failed', error);
      }
    }, 1000);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, enabled]);

  /**
   * 저장된 초안 복원
   */
  const restore = (): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as T;
      logger.info('Draft restored', { key });
      return parsed;
    } catch (error) {
      logger.error('Draft restore failed', error);
      return null;
    }
  };

  /**
   * 저장된 초안 삭제
   */
  const clear = () => {
    try {
      localStorage.removeItem(key);
      logger.debug('Draft cleared', { key });
    } catch (error) {
      logger.error('Draft clear failed', error);
    }
  };

  return { restore, clear };
}

/**
 * 다이얼로그 닫을 때 확인 메시지 (내용이 있을 때만)
 *
 * @param hasContent - 작성 중인 내용이 있는지 여부
 * @returns 닫아도 되는지 여부 (true: 닫기, false: 유지)
 */
export function confirmCloseDialog(hasContent: boolean): boolean {
  if (!hasContent) return true;

  return window.confirm(
    '작성 중인 내용이 있습니다.\n' +
    '닫으면 내용이 임시 저장되며, 다음에 다시 열면 복원됩니다.\n\n' +
    '정말 닫으시겠습니까?'
  );
}
