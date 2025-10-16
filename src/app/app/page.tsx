'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import { useAuth } from '@/contexts/AuthContext';
import { getParticipantByFirebaseUid } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isCheckingParticipant, setIsCheckingParticipant] = useState(false);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // 로그인 상태이고 체크 중이 아닌 경우
      if (user && !isCheckingParticipant) {
        setIsCheckingParticipant(true);

        try {
          logger.info('기존 로그인 감지, participant 조회 시작', { uid: user.uid });

          // Firebase UID로 participant 조회
          const participant = await getParticipantByFirebaseUid(user.uid);

          if (participant) {
            logger.info('Participant 조회 성공, 채팅으로 이동', {
              participantId: participant.id,
              cohortId: participant.cohortId
            });

            // 채팅 페이지로 리다이렉트
            router.replace(appRoutes.chat(participant.cohortId));
          } else {
            logger.warn('Firebase UID와 연결된 participant 없음', { uid: user.uid });
            // Participant가 없으면 로그인 화면 표시
            setIsCheckingParticipant(false);
          }
        } catch (error) {
          logger.error('Participant 조회 실패:', error);
          setIsCheckingParticipant(false);
        }
      }
    };

    checkAuthAndRedirect();
  }, [user, router, isCheckingParticipant]);

  // 로딩 중 (Firebase Auth 초기화 중)
  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 이미 로그인된 상태이고 participant 체크 중
  if (user && isCheckingParticipant) {
    return (
      <div className="app-shell flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600">로그인 정보 확인 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 필요 또는 participant 없음
  return (
    <div className="app-shell flex items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}