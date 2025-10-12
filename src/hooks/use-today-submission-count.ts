'use client';

import { useState, useEffect, useRef } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { getTodayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { logger } from '@/lib/logger';

/**
 * 오늘 제출 현황 실시간 카운트 Hook
 * 내일 매칭 대상 참가자 수를 실시간으로 표시
 * Firebase onSnapshot으로 자동 업데이트
 * 🔒 해당 코호트 참가자만 필터링 (다중 코호트 운영 시 데이터 혼입 방지)
 */
export function useTodaySubmissionCount(cohortId?: string) {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // 마운트 상태 추적
    isMountedRef.current = true;

    if (!cohortId) {
      setIsLoading(false);
      return;
    }

    const today = getTodayString();
    const question = getDailyQuestionText(today);

    setIsLoading(true);
    setError(null);

    // 실시간 리스너 설정
    const db = getDb();
    const q = query(
      collection(db, 'reading_submissions'),
      where('submissionDate', '==', today),
      where('dailyQuestion', '==', question)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // 제출한 참가자 ID 수집 (동기 처리)
        const participantIds = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          participantIds.add(data.participantId);
        });

        if (participantIds.size === 0) {
          if (isMountedRef.current) {
            setCount(0);
            setIsLoading(false);
          }
          return;
        }

        // 🔒 비동기 필터링을 별도 함수로 분리 (메모리 누수 방지)
        filterByCohort(db, participantIds, cohortId)
          .then((validCount) => {
            if (isMountedRef.current) {
              setCount(validCount);
              setIsLoading(false);
            }
          })
          .catch((err) => {
            if (isMountedRef.current) {
              logger.error('오늘 제출 참가자 필터링 실패', err);
              setError(err as Error);
              setIsLoading(false);
            }
          });
      },
      (err) => {
        if (isMountedRef.current) {
          logger.error('오늘 제출 현황 조회 실패', err);
          setError(err as Error);
          setIsLoading(false);
        }
      }
    );

    // 클린업: 컴포넌트 언마운트 시 리스너 해제
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [cohortId]);

  return { count, isLoading, error };
}

/**
 * 코호트별 참가자 필터링 (비동기)
 * 🔒 관리자 제외 (isAdmin, isAdministrator)
 * onSnapshot 콜백 외부로 분리하여 메모리 누수 방지
 */
async function filterByCohort(
  db: ReturnType<typeof getDb>,
  participantIds: Set<string>,
  cohortId: string
): Promise<number> {
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
      // 🔒 관리자는 제출 현황에서 제외 (매칭 대상이 아니므로)
      if (!data.isAdmin && !data.isAdministrator) {
        validParticipantIds.add(doc.id);
      }
    });
  }

  return validParticipantIds.size;
}
