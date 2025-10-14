/**
 * Firebase Admin SDK Timestamp 변환 유틸리티
 */

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
    console.error('Timestamp 변환 실패:', error);
    return null;
  }
}

/**
 * Date를 포맷팅 (null-safe)
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
    const { format } = require('date-fns');
    return format(date, formatStr);
  } catch (error) {
    return fallback;
  }
}
