'use client';

import { ReactNode } from 'react';
import AppViewportEffect from '@/components/AppViewportEffect';
import RegisterServiceWorker from '../app/register-sw';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import InAppBrowserBlocker from '@/components/InAppBrowserBlocker';

/**
 * App 레벨 클라이언트 전용 Provider 통합
 *
 * 서버 컴포넌트 레이아웃에서 분리된 클라이언트 로직:
 * - ViewModeProvider: localStorage 기반 상태 관리
 * - AppViewportEffect: iOS PWA viewport 계산
 * - RegisterServiceWorker: Service Worker 등록
 * - InAppBrowserBlocker: 카카오톡/인스타그램 등 인앱 브라우저 차단
 *
 * Note: 앱 배지는 DM 대화창을 열 때만 제거됩니다 (DirectMessageDialog)
 */
export default function AppClientProviders({ children }: { children: ReactNode }) {
  return (
    <ViewModeProvider>
      <AppViewportEffect />
      <RegisterServiceWorker />
      <InAppBrowserBlocker>{children}</InAppBrowserBlocker>
    </ViewModeProvider>
  );
}
