import { format } from 'date-fns';

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns 오늘 날짜 문자열 (예: "2025-10-09")
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
