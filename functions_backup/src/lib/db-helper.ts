/**
 * Firestore Database Helper
 *
 * Seoul region DB instance를 반환하는 공용 헬퍼 함수
 * - functions/src/index.ts
 * - functions/src/scheduled-random-matching.ts
 * 에서 공통으로 사용
 */

import * as admin from 'firebase-admin';

/**
 * Seoul Firestore instance 반환
 *
 * @returns Seoul region Firestore instance
 */
export function getSeoulDB() {
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(admin.app(), 'seoul');
}
