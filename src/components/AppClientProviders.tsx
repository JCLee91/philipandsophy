'use client';

import { ReactNode } from 'react';
import AppViewportEffect from '@/components/AppViewportEffect';
import RegisterServiceWorker from '../app/register-sw';
import { ViewModeProvider } from '@/contexts/ViewModeContext';

/**
 * App 레벨 클라이언트 전용 Provider 통합
 *
 * 서버 컴포넌트 레이아웃에서 분리된 클라이언트 로직:
 * - ViewModeProvider: localStorage 기반 상태 관리
 * - AppViewportEffect: iOS PWA viewport 계산
 * - RegisterServiceWorker: Service Worker 등록
 */
export default function AppClientProviders({ children }: { children: ReactNode }) {
  return (
    <ViewModeProvider>
      <AppViewportEffect />
      <RegisterServiceWorker />
      {children}
    </ViewModeProvider>
  );
}
