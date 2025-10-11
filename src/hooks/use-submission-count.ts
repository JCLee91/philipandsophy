'use client';

import { useState, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getTodayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { logger } from '@/lib/logger';

/**
 * 실시간 제출 현황 카운트 Hook
 * Firebase onSnapshot으로 자동 업데이트
 */
export function useSubmissionCount(cohortId?: string, date?: string) {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cohortId) {
      setIsLoading(false);
      return;
    }

    const targetDate = date || getTodayString();
    const question = getDailyQuestionText(targetDate);

    setIsLoading(true);
    setError(null);

    // 실시간 리스너 설정
    const db = getDb();
    const q = query(
      collection(db, 'reading_submissions'),
      where('submissionDate', '==', targetDate),
      where('dailyQuestion', '==', question)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // 중복 제거 (한 사람이 여러 번 제출한 경우)
        const uniqueParticipantIds = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          uniqueParticipantIds.add(data.participantId);
        });

        setCount(uniqueParticipantIds.size);
        setIsLoading(false);
      },
      (err) => {
        logger.error('실시간 제출 현황 조회 실패', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    // 클린업: 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [cohortId, date]);

  return { count, isLoading, error };
}
