'use client';

import { useQuery } from '@tanstack/react-query';
import { getParticipantByFirebaseUid } from '@/lib/firebase';
import { Participant } from '@/types/database';
import { logger } from '@/lib/logger';
import { deleteClientCookie, setClientCookie } from '@/lib/cookies';

/**
 * Firebase UID로 Participant 데이터를 조회하는 React Query 훅
 *
 * @param firebaseUid - Firebase Authentication UID
 * @param enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns TanStack Query 결과 객체
 */
export function useParticipant(firebaseUid: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['participant', firebaseUid],
    queryFn: async (): Promise<Participant | null> => {
      if (!firebaseUid) {
        return null;
      }

      try {
        const participant = await getParticipantByFirebaseUid(firebaseUid);

        if (!participant) {

          deleteClientCookie('pns-participant');
          deleteClientCookie('pns-cohort');
          return null;
        }

        // ✅ localStorage에 participantId 저장 (푸시 알림용)
        try {
          localStorage.setItem('participantId', participant.id);

        } catch (error) {

        }

        // ✅ 쿠키에도 participant 정보 저장 (서버 사이드 라우팅 보호용)
        setClientCookie('pns-participant', participant.id);
        if (participant.cohortId) {
          setClientCookie('pns-cohort', participant.cohortId);
        } else {
          deleteClientCookie('pns-cohort');
        }

        return participant;
      } catch (error) {

        throw error;
      }
    },
    enabled: enabled && !!firebaseUid,
    // React Query 재시도 정책 (2회로 축소, 빠른 실패)
    retry: 2,
    retryDelay: 1000, // 고정 1초 (총 최대 2초 대기)
    // 캐싱 전략
    staleTime: 0, // 항상 최신 데이터 조회 (참가자 정보는 정확성이 중요)
    gcTime: 5 * 60 * 1000, // 5분 (메모리 유지 시간 단축)
    // 에러 발생 시에도 이전 데이터 유지
    placeholderData: (previousData) => previousData,
  });
}
