'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DataCenterSidebar from './DataCenterSidebar';
import DataCenterHeader from './DataCenterHeader';
import AccessDenied from './AccessDenied';
import { Loader2 } from 'lucide-react';

interface DataCenterLayoutProps {
  children: ReactNode;
}

export default function DataCenterLayout({ children }: DataCenterLayoutProps) {
  const pathname = usePathname();
  const { user, isAdministrator, isLoading } = useAuth();

  // 로그인 페이지에서는 사이드바/헤더 숨김
  const isLoginPage = pathname === '/datacntr/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 로그인 안 됨 또는 관리자 아님 → 접근 거부
  if (!user || !isAdministrator) {
    return <AccessDenied />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <DataCenterSidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:ml-[240px]">
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
