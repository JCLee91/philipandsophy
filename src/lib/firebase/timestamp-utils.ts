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
 * Returns 0 if the input is invalid or null
 */
export function getTimestampMillis(value: SerializedTimestamp | Timestamp | null | undefined): number {
  if (!value) {
    return 0;
  }

  try {
    if (value instanceof Timestamp) {
      return value.toMillis();
    }

    // SerializedTimestamp 체크
    if (typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
      return value._seconds * 1000 + Math.floor(value._nanoseconds / 1000000);
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Get Date from serialized or Firestore Timestamp
 * Returns null if the input is invalid or null
 */
export function getTimestampDate(value: SerializedTimestamp | Timestamp | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  try {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    // SerializedTimestamp 체크
    if (typeof value === 'object' && '_seconds' in value) {
      const date = new Date(value._seconds * 1000);
      // Invalid Date 체크
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    }

    return null;
  } catch (error) {
    return null;
  }
}
