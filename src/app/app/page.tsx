'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import SplashScreen from '@/features/auth/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { appRoutes } from '@/lib/navigation';
import { useActiveCohorts, useRealtimeCohort } from '@/hooks/use-cohorts';

export const dynamic = 'force-dynamic';

const MAX_LOADING_TIME = 10000;
const MIN_SPLASH_TIME = 1000;

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading, retryParticipantFetch } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  // Impersonate 모드 확인 (초기값에서 바로 설정하여 타이밍 이슈 방지)
  const [isImpersonating] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pns_admin_impersonation') === 'true';
    }
    return false;
  });

  const isAdminUser = Boolean(participant?.isAdministrator || participant?.isSuperAdmin);
  const {
    data: activeCohorts = [],
    isLoading: activeCohortsLoading,
    error: activeCohortsError,
  } = useActiveCohorts({
    enabled: isAdminUser,
    refetchOnWindowFocus: false,
  });

  const targetCohortId = participant?.cohortId;
  const { data: targetCohort, isLoading: isCohortLoading } = useRealtimeCohort(targetCohortId || undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_TIME);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || (isAdminUser && activeCohortsLoading)) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, MAX_LOADING_TIME);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAdminUser, activeCohortsLoading]);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const currentUrl = window.location.href;

    if (userAgent.includes('kakaotalk')) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      return;
    }

    if (userAgent.includes('line')) {
      const separator = currentUrl.includes('?') ? '&' : '?';
      window.location.href = `${currentUrl}${separator}openExternalBrowser=1`;
      return;
    }

  }, []);

  useEffect(() => {
    if (participantStatus === 'ready' && participant && !hasNavigated) {
      // If we have a cohort ID, ensure we have checked the cohort status.
      // We rely on isCohortLoading, but we also need to handle the race condition.
      
      // 1. If loading, wait.
      if (isCohortLoading) return;
      
      // 2. If we have an ID but no data, and we are NOT loading...
      // This happens when the ID just changed and the hook hasn't updated loading state yet (async state update).
      // We must wait for the data to arrive.
      if (targetCohortId && !targetCohort) {
         return;
      }

      let targetCohortIdToNavigate: string | null = null;

      // Impersonate 모드가 아닌 관리자만 최신 활성 코호트로 이동
      const shouldUseAdminLogic = isAdminUser && !isImpersonating;

      if (shouldUseAdminLogic) {
        const activeCohort = activeCohorts[0];

        if (activeCohort) {
          targetCohortIdToNavigate = activeCohort.id;
        } else if (!activeCohortsLoading || loadingTimeout || activeCohortsError) {
          targetCohortIdToNavigate = participant.cohortId;
        }
      } else {
        // 일반 유저 또는 Impersonate 모드: 타겟 유저의 cohortId 사용
        targetCohortIdToNavigate = participant.cohortId;
      }

      if (targetCohortIdToNavigate) {
        setHasNavigated(true);
        router.replace(appRoutes.chat(targetCohortIdToNavigate));
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
    isImpersonating,
    router,
    isCohortLoading,
    targetCohort,
    targetCohortId,
  ]);

  // 로딩 타임아웃 시 재시도 UI 표시 (스플래시 무한 표시 방지)
  if (loadingTimeout && (isLoading || isCohortLoading)) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-sm text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">로딩이 오래 걸리고 있습니다</h2>
          <p className="text-gray-600">
            네트워크 연결이 느리거나 일시적인 문제가 있을 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadingTimeout(false);
              retryParticipantFetch();
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
          >
            앱 새로고침
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !minSplashElapsed || isCohortLoading) {
    return <SplashScreen />;
  }

  // Handle initialization error specifically
  if (participantStatus === 'error') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-sm text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">접속 오류</h2>
          <p className="text-gray-600">
            사용자 정보를 불러오는데 실패했습니다.<br />
            잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={() => retryParticipantFetch()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  if (participantStatus === 'ready' && participant) {
    if (!hasNavigated) {
      return <SplashScreen />;
    }
    return null;
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
