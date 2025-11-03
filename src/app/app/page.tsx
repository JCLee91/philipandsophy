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
// 최소 스플래시 표시 시간 (1초)
const MIN_SPLASH_TIME = 1000;

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  const isAdminUser = Boolean(participant?.isAdministrator || participant?.isSuperAdmin);
  const {
    data: activeCohorts = [],
    isLoading: activeCohortsLoading,
    error: activeCohortsError,
  } = useActiveCohorts({
    enabled: isAdminUser,
    refetchOnWindowFocus: false,
  });

  // ✅ 최소 스플래시 시간 보장 (1초)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
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
    if (participantStatus === 'ready' && participant && !hasNavigated) {
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
        setHasNavigated(true);
        router.replace(appRoutes.chat(targetCohortId));
      }
    }
  }, [
    participantStatus,
    participant,
    activeCohorts,
    activeCohortsLoading,
    activeCohortsError,
    loadingTimeout,
    hasNavigated,
    isAdminUser,
    router,
  ]);

  // ✅ 로딩 중이거나 최소 시간 미경과 시 스플래시 표시
  if (isLoading || !minSplashElapsed) {
    return <SplashScreen />;
  }

  // ✅ 로그인 완료 상태
  if (participantStatus === 'ready' && participant) {
    // 네비게이션 전까지 스플래시 유지
    if (!hasNavigated) {
      return <SplashScreen />;
    }
    // 네비게이션 완료: null 반환 (채팅 페이지 표시)
    return null;
  }

  // ✅ 로그인 필요 (idle, missing, error 등)
  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
