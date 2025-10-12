'use client';

import { useState, useEffect, useRef } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/database';
import type { Participant } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * 기수별 참가자 실시간 조회 Hook
 *
 * Firebase onSnapshot으로 실시간 동기화
 * - 첫 번째 콜백: fromCache (캐시에서 즉시 로드, ~100ms)
 * - 두 번째 콜백: 네트워크 (완전한 최신 데이터, ~500ms)
 * - 참가자 추가/삭제 시 자동 업데이트
 *
 * 사용처: 관리자 매칭 관리 페이지 (세션 시간 길고, 실시간 동기화 필요)
 */
export function useParticipantsByCohortRealtime(cohortId: string | undefined) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // 마운트 상태 추적
    isMountedRef.current = true;

    if (!cohortId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // 실시간 리스너 설정
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.PARTICIPANTS),
      where('cohortId', '==', cohortId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMountedRef.current) return;

        const fromCache = snapshot.metadata.fromCache;
        const participantsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Participant[];

        // 디버깅 로그 (development only)
        if (process.env.NODE_ENV === 'development') {
          logger.info('참가자 리스트 업데이트', {
            cohortId,
            count: participantsList.length,
            fromCache,
            source: fromCache ? 'cache' : 'network',
          });
        }

        setParticipants(participantsList);
        setIsFromCache(fromCache);
        setIsLoading(false);
      },
      (err) => {
        if (!isMountedRef.current) return;

        logger.error('참가자 리스트 실시간 조회 실패', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    // 클린업: 컴포넌트 언마운트 시 리스너 해제
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [cohortId]);

  return {
    data: participants,
    isLoading,
    isFromCache,
    error,
  };
}
