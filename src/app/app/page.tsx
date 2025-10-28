'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import SplashScreen from '@/features/auth/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';
import { useActiveCohorts } from '@/hooks/use-cohorts';

// ✅ Disable static generation - requires runtime authentication state
export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // 관리자만 활성 코호트 조회 (일반 사용자는 불필요)
  const isAdmin = participant?.isAdministrator || participant?.isSuperAdmin;
  const { data: activeCohorts = [] } = useActiveCohorts();

  // ✅ 인앱 브라우저 감지 및 외부 브라우저로 리다이렉트
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const currentUrl = window.location.href;

    // 카카오톡 인앱 브라우저
    if (userAgent.includes('kakaotalk')) {
      logger.info('카카오톡 인앱 브라우저 감지, 외부 브라우저로 리다이렉트');
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      return;
    }

    // 라인 인앱 브라우저 (쿼리 파라미터 방식)
    if (userAgent.includes('line')) {
      logger.info('라인 인앱 브라우저 감지, 외부 브라우저로 리다이렉트');
      const separator = currentUrl.includes('?') ? '&' : '?';
      window.location.href = `${currentUrl}${separator}openExternalBrowser=1`;
      return;
    }

    // 인스타그램 인앱 브라우저
    if (userAgent.includes('instagram')) {
      logger.info('인스타그램 인앱 브라우저 감지, 안내 메시지 표시');
      // 인스타그램은 URL 스킴이 없어서 사용자에게 안내만 가능
      // 필요시 안내 모달 추가
    }

    // 페이스북 인앱 브라우저
    if (userAgent.includes('fbav') || userAgent.includes('fban')) {
      logger.info('페이스북 인앱 브라우저 감지, 안내 메시지 표시');
      // 페이스북도 URL 스킴 미지원
    }
  }, []);

  // ✅ participant가 ready 상태이면 채팅으로 바로 이동
  useEffect(() => {
    if (!isLoading && participantStatus === 'ready' && participant) {
      let targetCohortId: string;

      // 관리자는 활성 코호트로, 일반 사용자는 자신의 코호트로 이동
      if (participant.isAdministrator || participant.isSuperAdmin) {
        // 활성 코호트 중 첫 번째 사용 (보통 1개만 활성)
        const activeCohort = activeCohorts[0];

        if (activeCohort) {
          targetCohortId = activeCohort.id;
          logger.info('관리자 로그인 감지, 활성 코호트로 이동', {
            participantId: participant.id,
            activeCohortId: activeCohort.id,
            activeCohortName: activeCohort.name,
          });
        } else {
          // 활성 코호트가 없으면 자신의 코호트로
          targetCohortId = participant.cohortId;

        }
      } else {
        targetCohortId = participant.cohortId;
        logger.info('일반 사용자 로그인 감지, 자신의 코호트로 이동', {
          participantId: participant.id,
          cohortId: participant.cohortId,
        });
      }

      router.replace(appRoutes.chat(targetCohortId));
    }
  }, [isLoading, participantStatus, participant, activeCohorts, router]);

  // ✅ 스플래시 화면 표시 (로딩 중이거나 초기 진입 시)
  if (showSplash || isLoading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ✅ 로그인 한 상태면 리다이렉트
  if (participantStatus === 'ready' && participant) {
    return null;
  }

  // ✅ 로그인 필요
  return (
    <div className="app-shell flex items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
