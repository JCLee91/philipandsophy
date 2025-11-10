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
  return useQuery<string[], Error, Set<string>>({
    queryKey: ['yesterdayVerifiedParticipants', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];

      try {
        // 매칭 대상 날짜 계산 (새벽 2시 마감 정책 적용)
        // 0-2시: 이틀 전 날짜, 2시 이후: 어제 날짜
        const targetDate = getMatchingTargetDate();

        // reading_submissions에서 어제 제출물 조회
        // submissionDate === targetDate (cohortId는 참가자 조인으로 필터링)
        const db = getDb();
        const submissionsRef = collection(db, 'reading_submissions');
        const q = query(
          submissionsRef,
          where('submissionDate', '==', targetDate)
        );

        const snapshot = await getDocs(q);

        // participantId를 임시 Set으로 수집 (중복 제거, draft 제외)
        const tempParticipantIds = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.participantId && data.status !== 'draft') {
            tempParticipantIds.add(data.participantId);
          }
        });

        // 참가자 조회하여 cohortId 필터링
        if (tempParticipantIds.size === 0) {
          return [];
        }

        const participantsRef = collection(db, 'participants');
        const participantIds = new Set<string>();

        // 10개씩 나눠서 조회 (Firestore 'in' 제한)
        const idsArray = Array.from(tempParticipantIds);
        for (let i = 0; i < idsArray.length; i += 10) {
          const chunk = idsArray.slice(i, i + 10);
          const participantsQuery = query(
            participantsRef,
            where('__name__', 'in', chunk),
            where('cohortId', '==', cohortId)
          );
          const participantsSnapshot = await getDocs(participantsQuery);
          participantsSnapshot.forEach(doc => {
            participantIds.add(doc.id);
          });
        }

        logger.info('어제 인증자 목록 조회 완료', {
          cohortId,
          targetDate,
          count: participantIds.size,
          ids: Array.from(participantIds)
        });

        return Array.from(participantIds);
      } catch (error) {
        logger.error('어제 인증자 목록 조회 실패', error);
        throw error;
      }
    },
    enabled: !!cohortId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
    gcTime: 1000 * 60 * 10, // 10분 가비지 컬렉션
    select: (ids) => new Set(ids ?? []),
  });
}
