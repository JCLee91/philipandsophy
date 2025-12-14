'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, LogOut } from 'lucide-react';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { APP_CONSTANTS } from '@/constants/app';
import SplashScreen from '@/features/auth/components/SplashScreen';

export default function ImpersonationBanner() {
  const { user, participant, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 세션 스토리지 확인
    const impersonationFlag = sessionStorage.getItem('pns_admin_impersonation');
    const adminUid = sessionStorage.getItem('pns_impersonation_admin_uid');
    // 배너는 "관리자 → 유저" 전환이 완료된 후(=Auth uid가 바뀐 후)에만 표시
    const isTransitionComplete =
      impersonationFlag === 'true' && !!user?.uid && !!adminUid && user.uid !== adminUid;

    setIsImpersonating(isTransitionComplete);
  }, [user?.uid]);

  const handleExit = async () => {
    let shouldClearExiting = true;
    try {
      setIsExiting(true);
      // 1. 저장된 관리자 토큰 확인
      const adminToken = sessionStorage.getItem('pns_admin_token');
      const storedReturnUrl = sessionStorage.getItem('pns_impersonation_return_url') || '/datacntr/participants';
      const auth = getFirebaseAuth();

      const impersonatedCohortId = participant?.cohortId ?? null;

      if (adminToken) {
        try {
          // 2. 관리자 토큰으로 재로그인 시도
          const credential = await signInWithCustomToken(auth, adminToken);
          // iOS PWA에서 Auth persistence가 안정화되기 전에 라우팅하면 흰 화면/무한 로딩이 발생할 수 있어
          // 토큰 확보 + 짧은 딜레이로 안정화 시간을 줌.
          await credential.user.getIdToken(true);
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 3. 저장된 viewMode 복원 (관리자 모드 복원)
          const savedViewMode = sessionStorage.getItem('pns_impersonation_view_mode');
          if (savedViewMode) {
            localStorage.setItem(APP_CONSTANTS.STORAGE_KEY_VIEW_MODE, savedViewMode);
          }

          // 4. 성공 시 스토리지 정리 및 이동
          sessionStorage.removeItem('pns_admin_impersonation');
          sessionStorage.removeItem('pns_admin_token');
          sessionStorage.removeItem('pns_impersonation_return_url');
          sessionStorage.removeItem('pns_impersonation_view_mode');
          sessionStorage.removeItem('pns_impersonation_admin_uid');

          // /app 경로로 복귀 시 활성 코호트 리디렉션 방지 플래그
          let returnUrl = storedReturnUrl;
          if (returnUrl.startsWith('/app')) {
            sessionStorage.setItem('pns_admin_returning_from_impersonation', 'true');
            if (impersonatedCohortId) {
              // 복귀 직후 /app에서 이동할 코호트(=방금 impersonated 유저의 코호트)
              sessionStorage.setItem('pns_impersonation_return_cohort_id', impersonatedCohortId);
            }
            // /app 하위 경로로 바로 들어가면 cohort query가 누락돼 다시 "기본 코호트"로 떨어질 수 있으므로,
            // /app에서 한 번 결정하도록 고정.
            returnUrl = '/app';
          }

          // iOS PWA에서 간헐적으로 캐시/히스토리로 인해 화면이 멈추는 케이스를 피하기 위해 cache-buster 부여
          const cacheBustedUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}r=${Date.now()}`;

          // 원래 진입했던 경로(데이터센터 or 앱)로 복귀
          shouldClearExiting = false;
          window.location.replace(cacheBustedUrl);
          return;
        } catch (loginError) {
          console.error('Admin token login failed:', loginError);
          // 토큰 만료 등으로 실패 시 아래 로그아웃 로직으로 진행
        }
      }

      // 5. 토큰 없거나 실패 시 일반 로그아웃
      await logout();
      sessionStorage.removeItem('pns_admin_impersonation');
      sessionStorage.removeItem('pns_admin_token');
      sessionStorage.removeItem('pns_impersonation_return_url');
      sessionStorage.removeItem('pns_impersonation_view_mode');
      sessionStorage.removeItem('pns_impersonation_admin_uid');

      // 관리자 로그인 페이지로 이동
      router.replace('/datacntr/login');
    } catch (error) {
      console.error('Failed to exit impersonation:', error);
    } finally {
      if (shouldClearExiting) {
        setIsExiting(false);
      }
    }
  };

  if (isExiting) return <SplashScreen />;
  if (!isImpersonating) return null;

  return (
    <>
      {/* 1. 화면 전체 테두리 (클릭 통과) */}
      {pathname.startsWith('/app') && (
        <div className="fixed inset-0 z-9999 border-4 border-amber-500 pointer-events-none" />
      )}

      {/* 2. 하단 플로팅 복귀 버튼 (클릭 가능) */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-9999 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={handleExit}
          disabled={isExiting}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-full shadow-lg font-bold transition-all hover:scale-105 active:scale-95"
        >
          <Eye className="h-4 w-4" />
          <span>{participant?.name || user?.email || '사용자'}</span>
          <LogOut className="h-4 w-4 ml-1" />
        </button>
      </div>
    </>
  );
}
