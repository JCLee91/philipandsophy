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

      logger.debug('Participant 조회 시작', { firebaseUid });

      try {
        const participant = await getParticipantByFirebaseUid(firebaseUid);

        if (!participant) {
          logger.warn('Participant not found for Firebase UID', { firebaseUid });
          deleteClientCookie('pns-participant');
          deleteClientCookie('pns-cohort');
          return null;
        }

        // ✅ localStorage에 participantId 저장 (푸시 알림용)
        try {
          localStorage.setItem('participantId', participant.id);
          logger.debug('Participant ID saved to localStorage', { participantId: participant.id });
        } catch (error) {
          logger.error('Failed to save participantId to localStorage:', error);
        }

        // ✅ 쿠키에도 participant 정보 저장 (서버 사이드 라우팅 보호용)
        setClientCookie('pns-participant', participant.id);
        if (participant.cohortId) {
          setClientCookie('pns-cohort', participant.cohortId);
        } else {
          deleteClientCookie('pns-cohort');
        }

        logger.info('Participant 조회 성공', {
          participantId: participant.id,
          name: participant.name,
          isAdministrator: participant.isAdministrator,
        });

        return participant;
      } catch (error) {
        logger.error('Participant 조회 실패', { firebaseUid, error });
        throw error;
      }
    },
    enabled: enabled && !!firebaseUid,
    // React Query 재시도 정책 (5회, 500ms 간격으로 증가)
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(500 * (attemptIndex + 1), 3000),
    // 캐싱 전략
    staleTime: 5 * 60 * 1000, // 5분 (참가자 정보는 자주 변경되지 않음)
    gcTime: 10 * 60 * 1000, // 10분 (메모리에 오래 유지)
    // 에러 발생 시에도 이전 데이터 유지
    placeholderData: (previousData) => previousData,
  });
}
