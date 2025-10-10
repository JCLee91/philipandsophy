'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 웹앱(/app) 경로에서만 body에 data-app 속성을 추가하는 컴포넌트
 * 랜딩페이지는 정상 스크롤, 웹앱은 overflow: hidden 적용
 */
export default function AppBodyClass() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith('/app');

  useEffect(() => {
    if (isAppRoute) {
      document.body.setAttribute('data-app', 'true');
    } else {
      document.body.removeAttribute('data-app');
    }

    // Cleanup on unmount
    return () => {
      document.body.removeAttribute('data-app');
    };
  }, [isAppRoute]);

  return null;
}
