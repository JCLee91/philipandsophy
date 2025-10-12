import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const KOREA_TIMEZONE = 'Asia/Seoul';

/**
 * 한국 시간(KST) 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 *
 * Vercel 서버는 UTC 타임존을 사용하므로, 명시적으로 한국 시간으로 변환해야 함.
 * 변환하지 않으면 00:00~08:59 KST 사이에 전날 날짜를 반환하여 매칭 실패.
 *
 * @returns 오늘 날짜 문자열 (예: "2025-10-12")
 *
 * @example
 * // Vercel 서버 시간: 2025-10-11 23:00 UTC
 * // 한국 시간: 2025-10-12 08:00 KST
 * getTodayString(); // "2025-10-12" (KST 기준)
 */
export function getTodayString(): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
  return format(nowKST, 'yyyy-MM-dd');
}

/**
 * 한국 시간(KST) 기준 어제 날짜를 YYYY-MM-DD 형식으로 반환
 *
 * 프로필북 매칭은 어제 제출된 독서 인증을 기반으로 실행됩니다.
 * 이 함수는 매칭 시스템 전용으로 사용됩니다.
 *
 * @returns 어제 날짜 문자열 (예: "2025-10-11")
 *
 * @example
 * // 한국 시간: 2025-10-12 10:00 KST
 * getYesterdayString(); // "2025-10-11" (KST 기준 어제)
 *
 * @see getTodayString - 오늘 날짜 조회
 */
export function getYesterdayString(): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
  const yesterdayKST = subDays(nowKST, 1);
  return format(yesterdayKST, 'yyyy-MM-dd');
}
