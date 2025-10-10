'use client';

import { useEffect, useState } from 'react';
import { detectIosStandalone } from '@/lib/platform-detection';

/**
 * iOS에서 PWA(standalone)로 실행 중인지 여부를 감지합니다.
 *
 * SSR/CSR Hydration 호환:
 * - 초기 상태를 null로 관리하여 서버/클라이언트 불일치 방지
 * - 클라이언트 렌더링 확인 후 감지 실행
 *
 * iOS 감지:
 * - iPad/iPhone/iPod UserAgent 체크
 * - iPadOS 13+ 감지 (MacIntel + touchPoints)
 * - Feature detection으로 보조 검증
 *
 * Standalone 감지:
 * - Modern API: matchMedia('display-mode: standalone')
 * - iOS 13 이하 레거시 지원 제거 (시장 점유율 0.1% 미만)
 *
 * @see {@link detectIosStandalone} 순수 함수 버전 (테스트 용이)
 */
export function useIsIosStandalone(): boolean {
  // SSR 호환: null로 초기화하여 hydration mismatch 방지
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;

    const updateStandalone = () => {
      const newValue = detectIosStandalone();

      // 값이 실제로 변경된 경우에만 setState 호출 (중복 방지)
      setIsStandalone(prev => {
        if (prev === newValue) return prev;
        return newValue;
      });
    };

    updateStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    // MediaQueryList 이벤트 핸들러 (타입 안전)
    const handleMediaChange = (event: MediaQueryListEvent) => {
      updateStandalone();
    };

    // pageshow 이벤트 핸들러 (bfcache 복원 시에만 실행)
    let pageShowTimeout: NodeJS.Timeout;
    const handlePageShow = (event: PageTransitionEvent) => {
      clearTimeout(pageShowTimeout);
      pageShowTimeout = setTimeout(() => {
        // bfcache에서 복원된 경우에만 재감지
        if (event.persisted) {
          updateStandalone();
        }
      }, 100);
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearTimeout(pageShowTimeout);
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isClient]);

  // SSR 및 초기 렌더링에서는 false 반환 (일관성 보장)
  return isStandalone ?? false;
}
