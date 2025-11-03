'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { getMatchingTargetDate } from '@/lib/date-utils';
import { logger } from '@/lib/logger';

/**
 * 어제 인증한 참가자 ID 목록을 조회하는 훅
 *
 * @param cohortId - 기수 ID
 * @returns 어제 인증한 참가자 ID Set
 *
 * @example
 * const { data: yesterdayVerifiedIds } = useYesterdayVerifiedParticipants(cohortId);
 * if (yesterdayVerifiedIds?.has(participantId)) {
 *   // 어제 인증한 사람
 * }
 */
export function useYesterdayVerifiedParticipants(cohortId: string | undefined) {
  return useQuery({
    queryKey: ['yesterdayVerifiedParticipants', cohortId],
    queryFn: async () => {
      if (!cohortId) return new Set<string>();

      try {
        // 어제 날짜 계산 (매칭 타겟 날짜)
        const targetDate = getMatchingTargetDate();

        // reading_submissions에서 어제 제출물 조회
        // submissionDate === targetDate && status !== 'draft'
        const db = getDb();
        const submissionsRef = collection(db, 'reading_submissions');
        const q = query(
          submissionsRef,
          where('cohortId', '==', cohortId),
          where('submissionDate', '==', targetDate),
          where('status', '!=', 'draft')
        );

        const snapshot = await getDocs(q);

        // participantId를 Set으로 수집 (중복 제거)
        const participantIds = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.participantId) {
            participantIds.add(data.participantId);
          }
        });

        logger.info('어제 인증자 목록 조회 완료', {
          cohortId,
          targetDate,
          count: participantIds.size,
          ids: Array.from(participantIds)
        });

        return participantIds;
      } catch (error) {
        logger.error('어제 인증자 목록 조회 실패', error);
        throw error;
      }
    },
    enabled: !!cohortId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
    gcTime: 1000 * 60 * 10, // 10분 가비지 컬렉션
  });
}
