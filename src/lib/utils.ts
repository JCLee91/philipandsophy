import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RefObject } from "react";
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const scrollToBottom = (selectorOrRef?: string | RefObject<HTMLElement>, delay = 100) => {
  setTimeout(() => {
    let element: HTMLElement | null = null;

    if (!selectorOrRef) {
      element = document.querySelector('main');
    } else if (typeof selectorOrRef === 'string') {
      element = document.querySelector(selectorOrRef);
    } else {
      element = selectorOrRef.current;
    }

    if (element) element.scrollTop = element.scrollHeight;
  }, delay);
};

/**
 * Firebase Timestamp를 날짜 문자열로 포맷
 * 오늘이면 '오늘', 어제면 '어제', 그 외에는 'M월 d일' 형식
 */
export const formatDate = (timestamp: Timestamp): string => {
  const date = timestamp.toDate();
  if (isToday(date)) return '오늘';
  if (isYesterday(date)) return '어제';
  return format(date, 'M월 d일', { locale: ko });
};

/**
 * Firebase Timestamp를 시간 문자열로 포맷
 * '오전/오후 h:mm' 형식
 */
export const formatTime = (timestamp: Timestamp): string => {
  const date = timestamp.toDate();
  return format(date, 'a h:mm', { locale: ko });
};

/**
 * Firebase Timestamp를 간단한 날짜 포맷으로 변환
 * 'M/d' 형식
 */
export const formatShortDate = (timestamp: Timestamp): string => {
  const date = timestamp.toDate();
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
