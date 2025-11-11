'use client';

import { useState, useEffect, useRef } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getMatchingTargetDate, getYesterdayString } from '@/lib/date-utils';
import { logger } from '@/lib/logger';
import { filterParticipantsByCohort } from '@/lib/firestore-utils';

/**
 * 매칭 대상 제출 현황 실시간 카운트 Hook
 * 프로필북 전달 대상 참가자 수를 실시간으로 표시
 * Firebase onSnapshot으로 자동 업데이트
 * 🔒 해당 코호트 참가자만 필터링 (다중 코호트 운영 시 데이터 혼입 방지)
 *
 * 새벽 2시 마감 정책 적용:
 * - 02:00~23:59: 어제 제출자가 매칭 대상
 * - 00:00~01:59: 이틀 전 제출자가 매칭 대상 (어제는 아직 마감 안 됨)
 */
export function useYesterdaySubmissionCount(cohortId?: string) {
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

    // 새벽 2시 마감 정책 적용된 매칭 대상 날짜
    // 0-2시: 이틀 전 날짜, 2시 이후: 어제 날짜
    const targetDate = getMatchingTargetDate();

    setIsLoading(true);
    setError(null);

    // 실시간 리스너 설정
    const db = getDb();
    const q = query(
      collection(db, 'reading_submissions'),
      where('submissionDate', '==', targetDate),
      where('status', '!=', 'draft') // draft 제외 (임시저장은 카운트 안 함)
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
        filterParticipantsByCohort(participantIds, cohortId, {
          excludeSuperAdmin: true,
          excludeGhost: true,
        })
          .then((validCount) => {
            if (isMountedRef.current) {
              setCount(validCount);
              setIsLoading(false);
            }
          })
          .catch((err) => {
            if (isMountedRef.current) {

              setError(err as Error);
              setIsLoading(false);
            }
          });
      },
      (err) => {
        if (isMountedRef.current) {

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

// ❌ REMOVED: filterByCohort 중복 함수 제거 (firestore-utils.ts로 통합)
