'use client';

import { useEffect, useState } from 'react';

/**
 * iOS에서 PWA(standalone)로 실행 중인지 여부를 감지합니다.
 * Safari의 matchMedia 및 navigator.standalone을 함께 체크합니다.
 */
export function useIsIosStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const userAgent = window.navigator.userAgent || '';
      const isIos = /iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
      const legacyStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(isIos && (isStandaloneDisplay || legacyStandalone));
    };

    detect();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = () => detect();

    mediaQuery.addEventListener('change', listener);
    window.addEventListener('pageshow', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
      window.removeEventListener('pageshow', listener);
    };
  }, []);

  return isStandalone;
}
