'use client';

import { ReactNode } from 'react';
import AppViewportEffect from '@/components/AppViewportEffect';
import RegisterServiceWorker from '../app/register-sw';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { useAppBadgeClear } from '@/hooks/use-app-badge';

/**
 * App 레벨 클라이언트 전용 Provider 통합
 *
 * 서버 컴포넌트 레이아웃에서 분리된 클라이언트 로직:
 * - ViewModeProvider: localStorage 기반 상태 관리
 * - AppViewportEffect: iOS PWA viewport 계산
 * - RegisterServiceWorker: Service Worker 등록
 * - useAppBadgeClear: 앱 진입 시 배지 제거
 */
export default function AppClientProviders({ children }: { children: ReactNode }) {
  // 앱 열릴 때 배지 자동 제거
  useAppBadgeClear();

  return (
    <ViewModeProvider>
      <AppViewportEffect />
      <RegisterServiceWorker />
      {children}
    </ViewModeProvider>
  );
}
