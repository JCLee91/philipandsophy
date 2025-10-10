'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useIsIosStandalone } from '@/hooks/use-standalone-ios';

interface PlatformContextValue {
  /**
   * iOS PWA (standalone 모드) 여부
   *
   * - true: iOS 홈 화면에서 실행된 PWA
   * - false: 브라우저 또는 다른 플랫폼
   */
  isIosStandalone: boolean;
}

const PlatformContext = createContext<PlatformContextValue>({
  isIosStandalone: false,
});

/**
 * Platform Provider
 *
 * 앱 전체에서 플랫폼 정보를 공유합니다.
 *
 * Features:
 * - iOS PWA 여부를 한 번만 감지하여 전역 공유
 * - 불필요한 리렌더링 방지
 * - 테스트 시 쉽게 mock 주입 가능
 *
 * Usage:
 * ```tsx
 * // src/app/providers.tsx
 * <PlatformProvider>
 *   <YourApp />
 * </PlatformProvider>
 *
 * // 컴포넌트에서 사용
 * const { isIosStandalone } = usePlatform();
 * ```
 */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const isIosStandalone = useIsIosStandalone();

  return (
    <PlatformContext.Provider value={{ isIosStandalone }}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Platform Hook
 *
 * 현재 플랫폼 정보를 가져옵니다.
 *
 * @returns { isIosStandalone: boolean }
 *
 * @example
 * ```tsx
 * const { isIosStandalone } = usePlatform();
 *
 * if (isIosStandalone) {
 *   // iOS PWA specific logic
 * }
 * ```
 */
export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }

  return context;
}
