'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DataCenterSidebar from './DataCenterSidebar';
import DataCenterHeader from './DataCenterHeader';
import AccessDenied from './AccessDenied';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface DataCenterLayoutProps {
  children: ReactNode;
}

export default function DataCenterLayout({ children }: DataCenterLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, participantStatus, isAdministrator, isLoading, logout } = useAuth();

  // 로그인 페이지에서는 사이드바/헤더 숨김
  const isLoginPage = pathname === '/datacntr/login';

  // 🔄 접근 제어: 미로그인 및 고아 계정 처리
  useEffect(() => {
    // 로그인 페이지 또는 로딩 중에는 체크하지 않음
    if (isLoginPage || isLoading) return;

    // 고아 계정 처리 (Firebase Auth O, Participant X)
    if (user && participantStatus === 'missing') {

      logout()
        .then(() => {
          router.push('/datacntr/login');
        })
        .catch((error) => {

          // 로그아웃 실패 시 window.location으로 강제 이동 (순환 참조 방지)
          window.location.href = '/datacntr/login';
        });
      return;
    }

    // 미로그인 상태 처리
    if (!user) {

      router.push('/datacntr/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, participantStatus, isLoading, isLoginPage]);
  // Note: logout과 router는 안정적인 참조이므로 의존성 배열에서 제외

  // 로그인 페이지는 레이아웃 없이 children만 렌더링
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Auth 체크 중 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 관리자 권한 체크 (로그인 및 참가자 정보 확인 완료 후)
  if (!isAdministrator) {
    return <AccessDenied />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <DataCenterSidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:ml-[260px]">
        {/* 헤더 */}
        <DataCenterHeader />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
