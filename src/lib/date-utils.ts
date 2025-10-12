import { format, subDays, parseISO, isValid, isFuture } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Timestamp } from 'firebase/firestore';
import { logger } from './logger';

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

/**
 * Firebase 제출물을 cutoff 날짜 기준으로 필터링 (KST 타임존 처리)
 *
 * 날짜 형식 검증, 미래 날짜 방지, 타임존 변환을 수행합니다.
 * 프로필북 매칭 시스템에서 스포일러 방지를 위해 사용됩니다.
 *
 * @template T - submittedAt 필드를 가진 제출물 타입
 * @param submissions - 필터링할 제출물 배열
 * @param cutoffDate - ISO 날짜 문자열 (YYYY-MM-DD) 또는 null (필터링 안 함)
 * @returns cutoff 날짜까지의 제출물 (해당일 23:59:59.999 KST 포함)
 *
 * @example
 * const filtered = filterSubmissionsByDate(allSubmissions, '2025-10-11');
 * // Returns: 2025-10-11 23:59:59.999 KST 이전 제출물
 *
 * @example
 * const all = filterSubmissionsByDate(allSubmissions, null);
 * // Returns: 모든 제출물 (필터링 안 함)
 */
export function filterSubmissionsByDate<T extends { id?: string; submittedAt: Timestamp }>(
  submissions: T[],
  cutoffDate: string | null
): T[] {
  // cutoffDate가 없으면 필터링 안 함
  if (!cutoffDate) return submissions;

  // 빈 배열이면 즉시 반환 (성능 최적화)
  if (submissions.length === 0) return submissions;

  // 입력 검증: 날짜 형식 확인
  const parsedDate = parseISO(cutoffDate);
  if (!isValid(parsedDate)) {
    logger.warn('Invalid cutoffDate format', { cutoffDate });
    return submissions; // 잘못된 형식이면 필터링 안 함
  }

  // 미래 날짜 방지 (스포일러 방지)
  if (isFuture(parsedDate)) {
    logger.warn('Future cutoffDate detected', { cutoffDate });
    return submissions; // 미래 날짜면 필터링 안 함
  }

  // KST 기준 cutoff 날짜 설정 (해당일 끝까지 포함)
  const cutoffDateKST = toZonedTime(`${cutoffDate}T23:59:59.999`, KOREA_TIMEZONE);

  return submissions.filter(sub => {
    // Null/undefined timestamp 체크
    if (!sub.submittedAt) {
      logger.warn('Missing submittedAt timestamp', { submissionId: sub.id || 'unknown' });
      return false;
    }

    const submissionDate = sub.submittedAt.toDate();
    const submissionKST = toZonedTime(submissionDate, KOREA_TIMEZONE);
    return submissionKST <= cutoffDateKST;
  });
}
