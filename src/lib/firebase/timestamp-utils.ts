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
 */
export function getTimestampMillis(value: SerializedTimestamp | Timestamp): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return value._seconds * 1000 + Math.floor(value._nanoseconds / 1000000);
}

/**
 * Get Date from serialized or Firestore Timestamp
 */
export function getTimestampDate(value: SerializedTimestamp | Timestamp): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date(value._seconds * 1000);
}
