'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import SplashScreen from '@/features/auth/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { appRoutes } from '@/lib/navigation';
import { useActiveCohorts } from '@/hooks/use-cohorts';
import { setClientCookie } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

const MAX_LOADING_TIME = 10000;
const MIN_SPLASH_TIME_DEFAULT_MS = 1000;
const MIN_SPLASH_TIME_PWA_MS = 200;
const NAVIGATION_TIMEOUT_TIME = 10000;

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const displayModeStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any)?.standalone === true;
  return Boolean(displayModeStandalone || iosStandalone);
}

function ensureAuthCookies(participantId: string, cohortId: string): boolean {
  if (typeof document === 'undefined') return false;

  if (!document.cookie.includes('pns-participant=')) {
    setClientCookie('pns-participant', participantId);
    setClientCookie('pns-cohort', cohortId);
    try {
      window.localStorage.setItem('participantId', participantId);
    } catch {
      // ignore
    }
  }

  return document.cookie.includes('pns-participant=');
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { participant, participantStatus, isLoading, retryParticipantFetch } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [lastNavigationUrl, setLastNavigationUrl] = useState<string | null>(null);
  const [navigationTimeout, setNavigationTimeout] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const navigationFallbackTimerRef = useRef<number | null>(null);
  // Impersonate 모드 확인 (초기값에서 바로 설정하여 타이밍 이슈 방지)
  const [isImpersonating] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pns_admin_impersonation') === 'true';
    }
    return false;
  });

  // Impersonation에서 복귀한 관리자인지 확인 (활성 코호트 리디렉션 방지)
  const [isReturningFromImpersonation] = useState(() => {
    if (typeof window !== 'undefined') {
      const flag = sessionStorage.getItem('pns_admin_returning_from_impersonation') === 'true';
      if (flag) {
        // 플래그 사용 후 즉시 제거 (1회성)
        sessionStorage.removeItem('pns_admin_returning_from_impersonation');
      }
      return flag;
    }
    return false;
  });

  // Impersonation 복귀 시 돌아갈 코호트(=방금 impersonated 유저의 코호트)
  const [returnCohortIdFromImpersonation] = useState(() => {
    if (typeof window === 'undefined') return null;
    const cohortId = sessionStorage.getItem('pns_impersonation_return_cohort_id');
    if (cohortId) {
      sessionStorage.removeItem('pns_impersonation_return_cohort_id');
      return cohortId;
    }
    return null;
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

  useEffect(() => {
    const minSplashMs = isStandalonePwa() ? MIN_SPLASH_TIME_PWA_MS : MIN_SPLASH_TIME_DEFAULT_MS;
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, minSplashMs);

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
      // /app/chat 서버 라우트에서 cohort 존재/권한을 검증하므로, 여기서는 cohort 로딩을 기다리지 않음.
      let targetCohortIdToNavigate: string | null = null;

      // impersonation에서 방금 복귀한 경우: 마지막으로 보던(impersonated 유저의) 코호트로 복귀
      if (isReturningFromImpersonation && returnCohortIdFromImpersonation) {
        targetCohortIdToNavigate = returnCohortIdFromImpersonation;
      } else {
      // Impersonate 모드가 아닌 관리자만 최신 활성 코호트로 이동
      // (단, impersonation에서 막 복귀한 경우는 제외 - 원래 보던 화면 유지)
      const shouldUseAdminLogic = isAdminUser && !isImpersonating && !isReturningFromImpersonation;

      if (shouldUseAdminLogic) {
        if (activeCohortsLoading) {
          return;
        }
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
      }

      if (targetCohortIdToNavigate) {
        if (!ensureAuthCookies(participant.id, targetCohortIdToNavigate)) {
          return;
        }

        const baseUrl = appRoutes.chat(targetCohortIdToNavigate);
        const cacheBustedUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}r=${Date.now()}`;
        setLastNavigationUrl(baseUrl);
        setHasNavigated(true);

        // 기본은 client navigation으로 빠르게 이동하고,
        // iOS PWA에서 next/navigation이 멈추는 케이스만 hard navigation으로 폴백한다.
        try {
          router.replace(baseUrl);
        } catch {
          window.location.replace(cacheBustedUrl);
          return;
        }

        if (navigationFallbackTimerRef.current) {
          window.clearTimeout(navigationFallbackTimerRef.current);
        }

        navigationFallbackTimerRef.current = window.setTimeout(() => {
          if (window.location.pathname === '/app') {
            window.location.replace(cacheBustedUrl);
          }
        }, 1500);
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
    isReturningFromImpersonation,
    returnCohortIdFromImpersonation,
    router,
  ]);

  useEffect(() => {
    if (pathname !== '/app' && navigationFallbackTimerRef.current) {
      window.clearTimeout(navigationFallbackTimerRef.current);
      navigationFallbackTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (navigationFallbackTimerRef.current) {
        window.clearTimeout(navigationFallbackTimerRef.current);
        navigationFallbackTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasNavigated || !lastNavigationUrl) return;
    const timer = setTimeout(() => setNavigationTimeout(true), NAVIGATION_TIMEOUT_TIME);
    return () => clearTimeout(timer);
  }, [hasNavigated, lastNavigationUrl]);

  // 로딩 타임아웃 시 재시도 UI 표시 (스플래시 무한 표시 방지)
  if (loadingTimeout && (isLoading || (isAdminUser && activeCohortsLoading))) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-xs text-center space-y-4">
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

  if (isLoading || !minSplashElapsed || (isAdminUser && activeCohortsLoading)) {
    return <SplashScreen />;
  }

  if (navigationTimeout && lastNavigationUrl) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-xs text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">화면 이동이 오래 걸리고 있습니다</h2>
          <p className="text-gray-600">
            iOS PWA 환경에서 인증 전환 직후 화면이 멈추는 경우가 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              const baseUrl = lastNavigationUrl;
              const retryUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}r=${Date.now()}`;
              window.location.replace(retryUrl);
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

  // Handle initialization error specifically
  if (participantStatus === 'error') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-xs text-center space-y-4">
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
    return <SplashScreen />;
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
