'use client';

import { useState, useEffect, useRef } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/database';
import type { ReadingSubmission } from '@/types/database';
import { logger } from '@/lib/logger';
import { filterParticipantsByCohort } from '@/lib/firestore-utils';

/**
 * 특정 날짜의 인증 목록을 가져오는 Hook
 * 
 * @param date - 조회할 날짜 (YYYY-MM-DD)
 * @param cohortId - 기수 ID
 */
export function useDailySubmissionsList(date: string, cohortId?: string) {
  const [submissions, setSubmissions] = useState<ReadingSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!cohortId || !date) {
      setIsLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const db = getDb();
        
        // 1. 날짜 기준 쿼리
        // 주의: 복합 인덱스가 필요할 수 있음 (submissionDate + status)
        const q = query(
          collection(db, COLLECTIONS.READING_SUBMISSIONS),
          where('submissionDate', '==', date),
          where('status', '!=', 'draft')
        );

        const snapshot = await getDocs(q);
        const rawSubmissions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ReadingSubmission));

        // 2. 해당 기수 참가자 필터링
        const participantIds = new Set(rawSubmissions.map(s => s.participantId));
        
        if (participantIds.size === 0) {
            if (isMountedRef.current) {
                setSubmissions([]);
                setIsLoading(false);
            }
            return;
        }

        // 3. 기수 필터링 및 유효한 참가자 ID만 추출
        // filterParticipantsByCohort는 유효한 ID의 개수를 반환하거나(count mode), 
        // 지금은 ID 목록을 검증해야 하므로 직접 구현하거나 기존 유틸 활용.
        // 하지만 filterParticipantsByCohort는 count를 반환함.
        // 여기서는 참가자 정보를 가져와서 cohortId를 확인해야 함.
        // 성능 최적화를 위해 useParticipantsByCohort 훅을 사용하는 컴포넌트에서 필터링하는 것이 나을 수도 있지만,
        // 여기서 직접 처리하려면 참가자 정보를 조회해야 함.
        
        // 간단하게, rawSubmissions의 participantId를 가지고 필터링.
        // 하지만 useDailySubmissionsList는 "목록"을 반환해야 하므로
        // 각 submission에 대한 participant 정보도 필요할 수 있음.
        // 일단은 submission 리스트만 반환하고, 상위에서 participant 정보와 매핑하거나
        // 여기서 필터링만 수행.
        
        // 기수 필터링을 위해 participant 정보를 가져오는 것은 비용이 듬.
        // 하지만 정확성을 위해 필요.
        
        // 개선: 이미 클라이언트가 participants 데이터를 가지고 있다면 그것을 활용하는 것이 좋음.
        // 하지만 이 훅은 독립적으로 동작해야 함.
        
        // 여기서는 간단히 모든 submission을 가져온 뒤, 
        // 화면단에서 participants 목록과 매칭하여 필터링하는 방식이 일반적임.
        // 하지만 데이터 양이 많으면 비효율적.
        // DB 구조상 reading_submissions에 cohortId가 있으면 좋겠지만,
        // types/database.ts를 보면 ReadingSubmission에 cohortId 필드가 있음 (2025-11-11 추가됨)
        
        // cohortId가 있다면 쿼리 레벨에서 필터링 가능!
        const submissionsWithCohort = rawSubmissions.filter(s => {
            if (s.cohortId) {
                return s.cohortId === cohortId;
            }
            // cohortId가 없는 구 데이터의 경우... 
            // 일단 제외하거나 별도 확인 필요. 최근 데이터는 다 있을 것으로 가정.
            return false; 
        });

        // 만약 cohortId가 없는 데이터도 지원해야 한다면, 추가 로직 필요.
        // 현재 시스템상 최근 데이터는 cohortId가 있을 것임.
        // (타입 정의상 optional이지만 마이그레이션 됨)
        
        if (isMountedRef.current) {
            setSubmissions(submissionsWithCohort);
        }

      } catch (err) {
        logger.error('Failed to fetch daily submissions', err);
        if (isMountedRef.current) {
          setError(err as Error);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchSubmissions();

    return () => {
      isMountedRef.current = false;
    };
  }, [date, cohortId]);

  return { submissions, isLoading, error };
}

