'use client';

import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Firestore 유틸리티 함수
 */

/**
 * 코호트별 참가자 ID 필터링
 *
 * Firestore 'in' 쿼리는 최대 10개까지만 가능하므로 배치 처리
 *
 * @param participantIds - 필터링할 참가자 ID Set
 * @param cohortId - 코호트 ID
 * @param options.excludeSuperAdmin - 슈퍼 관리자 제외 여부
 * @param options.excludeGhost - 고스트 참가자 제외 여부
 * @returns 유효한 참가자 수
 */
export async function filterParticipantsByCohort(
  participantIds: Set<string>,
  cohortId: string,
  options: {
    excludeSuperAdmin?: boolean;
    excludeGhost?: boolean;
  } = {}
): Promise<number> {
  const { excludeSuperAdmin = false, excludeGhost = false } = options;
  const db = getDb();
  const participantIdsArray = Array.from(participantIds);
  const validParticipantIds = new Set<string>();

  // Firestore 'in' 쿼리는 최대 10개까지만 가능하므로 배치 처리
  for (let i = 0; i < participantIdsArray.length; i += 10) {
    const batchIds = participantIdsArray.slice(i, i + 10);
    const participantsQuery = query(
      collection(db, 'participants'),
      where('__name__', 'in', batchIds),
      where('cohortId', '==', cohortId)
    );

    const participantsSnapshot = await getDocs(participantsQuery);
    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      // 옵션에 따라 필터링
      if (excludeSuperAdmin && data.isSuperAdmin) return;
      if (excludeGhost && data.isGhost) return;

      validParticipantIds.add(doc.id);
    });
  }

  return validParticipantIds.size;
}
