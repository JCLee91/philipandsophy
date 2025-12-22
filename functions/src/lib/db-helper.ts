/**
 * Firestore Database Helper
 *
 * (default) DB instance를 반환하는 공용 헬퍼 함수
 * 참고: 함수명은 하위 호환성을 위해 유지 (실제로는 default DB 사용)
 */

import * as admin from 'firebase-admin';

/**
 * Firestore instance 반환
 * 참고: 함수명은 하위 호환성을 위해 getSeoulDB로 유지
 *
 * @returns Firestore instance (default DB, Seoul region)
 */
export function getSeoulDB() {
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(admin.app());
}
