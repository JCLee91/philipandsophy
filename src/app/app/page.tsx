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

// 로딩 타임아웃 설정 (10초)
const MAX_LOADING_TIME = 10000;
// 최소 스플래시 표시 시간 (1.5초)
const MIN_SPLASH_TIME = 1500;

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [minSplashComplete, setMinSplashComplete] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const isAdminUser = Boolean(participant?.isAdministrator || participant?.isSuperAdmin);
  const {
    data: activeCohorts = [],
    isLoading: activeCohortsLoading,
    error: activeCohortsError,
  } = useActiveCohorts({
    enabled: isAdminUser,
    refetchOnWindowFocus: false,
  });

  // ✅ 최소 스플래시 시간 보장 (1.5초)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashComplete(true);
    }, MIN_SPLASH_TIME);

    return () => clearTimeout(timer);
  }, []);

  // ✅ 로딩 타임아웃 (10초)
  useEffect(() => {
    if (isLoading || (isAdminUser && activeCohortsLoading)) {
      const timer = setTimeout(() => {
        logger.warn('Loading timeout - forcing navigation');
        setLoadingTimeout(true);
      }, MAX_LOADING_TIME);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAdminUser, activeCohortsLoading]);

  // ✅ 인앱 브라우저 감지 및 외부 브라우저로 리다이렉트
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const currentUrl = window.location.href;

    // 카카오톡 인앱 브라우저
    if (userAgent.includes('kakaotalk')) {

      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      return;
    }

    // 라인 인앱 브라우저 (쿼리 파라미터 방식)
    if (userAgent.includes('line')) {

      const separator = currentUrl.includes('?') ? '&' : '?';
      window.location.href = `${currentUrl}${separator}openExternalBrowser=1`;
      return;
    }

    // 인스타그램 인앱 브라우저
    if (userAgent.includes('instagram')) {

      // 인스타그램은 URL 스킴이 없어서 사용자에게 안내만 가능
      // 필요시 안내 모달 추가
    }

    // 페이스북 인앱 브라우저
    if (userAgent.includes('fbav') || userAgent.includes('fban')) {

      // 페이스북도 URL 스킴 미지원
    }
  }, []);

  // ✅ 에러 로깅
  useEffect(() => {
    if (activeCohortsError) {
      logger.error('Failed to load active cohorts', activeCohortsError);
    }
  }, [activeCohortsError]);

  // ✅ participant가 ready 상태이면 채팅으로 바로 이동
  useEffect(() => {
    if (!isLoading && participantStatus === 'ready' && participant && minSplashComplete) {
      let targetCohortId: string | null = null;

      // 관리자는 활성 코호트로, 일반 사용자는 자신의 코호트로 이동
      if (isAdminUser) {
        const activeCohort = activeCohorts[0];

        if (activeCohort) {
          targetCohortId = activeCohort.id;
        } else if (!activeCohortsLoading || loadingTimeout || activeCohortsError) {
          // 로딩 완료, 타임아웃, 또는 에러 발생 시 → 자신의 코호트로
          targetCohortId = participant.cohortId;
        }
      } else {
        targetCohortId = participant.cohortId;
      }

      if (targetCohortId) {
        router.replace(appRoutes.chat(targetCohortId));
      }
    }
  }, [
    isLoading,
    participantStatus,
    participant,
    activeCohorts,
    activeCohortsLoading,
    activeCohortsError,
    loadingTimeout,
    minSplashComplete,
    isAdminUser,
    router,
  ]);

  // ✅ 스플래시 화면 표시 조건
  // - 초기 진입 시 (showSplash)
  // - 로딩 중 (isLoading)
  // - 관리자의 활성 코호트 로딩 중 (단, 타임아웃 전까지만)
  // - 최소 스플래시 시간 미완료
  const shouldShowSplash =
    showSplash ||
    isLoading ||
    !minSplashComplete ||
    (isAdminUser && activeCohortsLoading && !loadingTimeout && !activeCohortsError);

  if (shouldShowSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ✅ 로그인 한 상태면 리다이렉트 대기
  // 리다이렉트 중에는 아무것도 렌더링하지 않음 (빈 화면 방지를 위해 null 반환)
  if (participantStatus === 'ready' && participant) {
    return null;
  }

  // ✅ 로그인 필요 (로그아웃 상태 포함)
  // participantStatus가 'idle', 'missing', 'error' 등 모든 비로그인 상태에서 로그인 화면 표시
  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
