import { format as formatDate } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ko } from 'date-fns/locale';

/**
 * Firebase Admin SDK Timestamp 변환 유틸리티 (KST 타임존 지원)
 */

const KOREA_TIMEZONE = 'Asia/Seoul';

/**
 * Admin SDK Timestamp를 JavaScript Date로 안전하게 변환
 *
 * Admin SDK Timestamp 형식:
 * - { _seconds: number, _nanoseconds: number }
 *
 * @param timestamp - Firebase Admin SDK Timestamp 또는 Firestore Timestamp
 * @returns Date 객체 또는 null (변환 실패 시)
 */
export function safeTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;

  try {
    // 1. toDate() 메서드가 있으면 사용 (Firestore Timestamp)
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    // 2. Admin SDK Timestamp 형식 (_seconds)
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000);
    }

    // 3. seconds 필드 (일부 버전)
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }

    // 4. ISO 문자열
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }

    // 5. 이미 Date 객체
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? null : timestamp;
    }

    return null;
  } catch (error) {

    return null;
  }
}

/**
 * Firebase Timestamp를 KST(한국 시간) Date로 변환
 *
 * Vercel 서버는 UTC 타임존을 사용하므로, 명시적으로 한국 시간으로 변환 필요.
 * 변환하지 않으면 00:00~08:59 KST 사이에 전날 날짜 표시 가능.
 *
 * @param timestamp - Firebase Timestamp
 * @returns 한국 시간 Date 객체 또는 null
 */
export function timestampToKST(timestamp: any): Date | null {
  const date = safeTimestampToDate(timestamp);
  if (!date) return null;

  return toZonedTime(date, KOREA_TIMEZONE);
}

/**
 * Date를 포맷팅 (null-safe, 한국 locale)
 *
 * @param timestamp - Firebase Timestamp
 * @param formatStr - date-fns 포맷 문자열
 * @param fallback - 실패 시 기본값
 * @returns 포맷팅된 문자열
 */
export function formatTimestamp(
  timestamp: any,
  formatStr: string,
  fallback: string = '-'
): string {
  const date = safeTimestampToDate(timestamp);
  if (!date) return fallback;

  try {
    return formatDate(date, formatStr, { locale: ko });
  } catch (error) {
    return fallback;
  }
}

/**
 * Firebase Timestamp를 한국 시간(KST)으로 포맷팅
 *
 * 데이터센터 전용 함수. 모든 시간 표시를 한국 시간으로 통일.
 *
 * @param timestamp - Firebase Timestamp
 * @param formatStr - date-fns 포맷 문자열 (기본: 'yyyy년 M월 d일 HH:mm')
 * @param fallback - 실패 시 기본값
 * @returns 포맷팅된 한국 시간 문자열
 *
 * @example
 * formatTimestampKST(submittedAt) // "2025년 10월 17일 14:30"
 * formatTimestampKST(submittedAt, 'M월 d일 HH:mm') // "10월 17일 14:30"
 * formatTimestampKST(submittedAt, 'yy.MM.dd') // "25.10.17"
 */
export function formatTimestampKST(
  timestamp: any,
  formatStr: string = 'yyyy년 M월 d일 HH:mm',
  fallback: string = '-'
): string {
  const kstDate = timestampToKST(timestamp);
  if (!kstDate) return fallback;

  try {
    return formatDate(kstDate, formatStr, { locale: ko });
  } catch (error) {
    return fallback;
  }
}

/**
 * ISO 날짜 문자열을 한국 시간(KST)으로 포맷팅
 *
 * Cohort의 startDate, endDate 같은 ISO 문자열 전용.
 *
 * @param isoString - ISO 날짜 문자열 (예: '2025-10-17')
 * @param formatStr - date-fns 포맷 문자열 (기본: 'yyyy년 M월 d일')
 * @param fallback - 실패 시 기본값
 * @returns 포맷팅된 한국 시간 문자열
 *
 * @example
 * formatISODateKST('2025-10-17') // "2025년 10월 17일"
 * formatISODateKST('2025-10-17', 'yy.MM.dd') // "25.10.17"
 */
export function formatISODateKST(
  isoString: string | null | undefined,
  formatStr: string = 'yyyy년 M월 d일',
  fallback: string = '-'
): string {
  if (!isoString) return fallback;

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return fallback;

    const kstDate = toZonedTime(date, KOREA_TIMEZONE);
    return formatDate(kstDate, formatStr, { locale: ko });
  } catch (error) {
    return fallback;
  }
}
