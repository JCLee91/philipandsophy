import { Timestamp } from 'firebase/firestore';

/**
 * Serialized Timestamp from Server Component
 * (Firestore Admin SDK Timestamp converted to plain object)
 */
export type SerializedTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

/**
 * Convert serialized timestamp to Firestore Timestamp
 */
export function toTimestamp(value: SerializedTimestamp | Timestamp): Timestamp {
  if (value instanceof Timestamp) {
    return value;
  }
  return new Timestamp(value._seconds, value._nanoseconds);
}

/**
 * Get milliseconds from serialized or Firestore Timestamp
 * Returns 0 for invalid or missing timestamps
 */
export function getTimestampMillis(value: SerializedTimestamp | Timestamp | null | undefined): number {
  if (!value) {
    return 0;
  }

  try {
    if (value instanceof Timestamp) {
      return value.toMillis();
    }

    // SerializedTimestamp 체크 - 필드 유효성 확인
    if (typeof value === 'object' &&
        '_seconds' in value && typeof value._seconds === 'number' &&
        '_nanoseconds' in value && typeof value._nanoseconds === 'number') {
      return value._seconds * 1000 + Math.floor(value._nanoseconds / 1000000);
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Get Date from serialized or Firestore Timestamp
 * Returns null for invalid or missing timestamps
 *
 * Supports multiple formats:
 * - Firestore Timestamp instance
 * - SerializedTimestamp with _seconds/_nanoseconds
 * - Plain object with seconds/nanoseconds (React Query serialization)
 * - Date instance
 * - ISO string
 */
export function getTimestampDate(value: any): Date | null {
  if (!value) {
    return null;
  }

  try {
    // 1. Firestore Timestamp 인스턴스
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    // 2. 이미 Date 인스턴스인 경우
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    // 3. 문자열 (ISO date string)
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    // 4. 객체 형태들
    if (typeof value === 'object') {
      // 4-1. Admin SDK SerializedTimestamp (_seconds, _nanoseconds)
      if ('_seconds' in value && typeof value._seconds === 'number') {
        const date = new Date(value._seconds * 1000);
        return isNaN(date.getTime()) ? null : date;
      }

      // 4-2. React Query/서버 컴포넌트 직렬화 (seconds, nanoseconds)
      if ('seconds' in value && typeof value.seconds === 'number') {
        const date = new Date(value.seconds * 1000);
        return isNaN(date.getTime()) ? null : date;
      }

      // 4-3. toDate 메서드가 있는 객체
      if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date && !isNaN(date.getTime()) ? date : null;
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse timestamp:', { value, error });
    return null;
  }
}
