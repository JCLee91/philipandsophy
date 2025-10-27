import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RefObject } from "react";
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Timestamp } from 'firebase/firestore';
import { getTimestampDate, type SerializedTimestamp } from '@/lib/firebase/timestamp-utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const scrollToBottom = (
  selectorOrRef?: string | RefObject<HTMLElement>,
  options?: { behavior?: ScrollBehavior; delay?: number }
) => {
  const { behavior = 'smooth', delay = 0 } = options || {};

  const doScroll = () => {
    let element: HTMLElement | null = null;

    if (!selectorOrRef) {
      element = document.querySelector('main');
    } else if (typeof selectorOrRef === 'string') {
      element = document.querySelector(selectorOrRef);
    } else {
      element = selectorOrRef.current;
    }

    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior,
      });
    }
  };

  if (delay > 0) {
    setTimeout(doScroll, delay);
  } else {
    doScroll();
  }
};

/**
 * Firebase Timestamp를 날짜 문자열로 포맷
 * 오늘이면 '오늘', 어제면 '어제', 그 외에는 'M월 d일' 형식
 * SerializedTimestamp도 지원 (Server Component → Client Component)
 */
export const formatDate = (timestamp: Timestamp | SerializedTimestamp): string => {
  const date = getTimestampDate(timestamp);
  if (isToday(date)) return '오늘';
  if (isYesterday(date)) return '어제';
  return format(date, 'M월 d일', { locale: ko });
};

/**
 * Firebase Timestamp를 시간 문자열로 포맷
 * '오전/오후 h:mm' 형식
 * SerializedTimestamp도 지원 (Server Component → Client Component)
 */
export const formatTime = (timestamp: Timestamp | SerializedTimestamp): string => {
  const date = getTimestampDate(timestamp);
  return format(date, 'a h:mm', { locale: ko });
};

/**
 * Firebase Timestamp를 간단한 날짜 포맷으로 변환
 * 'M/d' 형식
 * SerializedTimestamp도 지원 (Server Component → Client Component)
 */
export const formatShortDate = (timestamp: Timestamp | SerializedTimestamp): string => {
  const date = getTimestampDate(timestamp);
  return format(date, 'M/d', { locale: ko });
};

/**
 * 이름에서 이니셜 생성
 * 예: '홍길동' -> 'ㅎㄱ', 'John Doe' -> 'JD'
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * 이름에서 성을 제거하고 이름만 반환
 * 예: '김철수' -> '철수', '홍길동' -> '길동', '이' -> '이'
 */
export const getFirstName = (name: string): string => {
  return name.length > 2 ? name.slice(1) : name;
};

/**
 * Promise에 타임아웃 적용
 *
 * @param promise - 타임아웃을 적용할 Promise
 * @param timeoutMs - 타임아웃 시간 (밀리초)
 * @param errorMessage - 타임아웃 시 에러 메시지
 * @returns 타임아웃이 적용된 Promise
 *
 * @example
 * const result = await withTimeout(
 *   fetchData(),
 *   5000,
 *   'Data fetch timeout'
 * );
 *
 * @note 타이머 누수 방지를 위해 Promise 완료 시 타이머 자동 정리
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = '요청 시간이 초과되었습니다'
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then(
      (result) => {
        // 성공 시 타이머 정리
        if (timeoutHandle) clearTimeout(timeoutHandle);
        return result;
      },
      (error) => {
        // 실패 시 타이머 정리
        if (timeoutHandle) clearTimeout(timeoutHandle);
        throw error;
      }
    ),
    timeoutPromise,
  ]);
}
