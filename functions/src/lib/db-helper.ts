/**
 * Firestore Database Helper
 *
 * (default) DB instance를 반환하는 공용 헬퍼 함수
 */

import * as admin from 'firebase-admin';

/**
 * Firestore instance 반환
 *
 * @returns Firestore instance (default DB)
 */
export function getDefaultDb() {
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(admin.app());
}
