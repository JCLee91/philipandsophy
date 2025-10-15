'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 웹앱(/app) 경로에서만 html과 body에 data-app 속성을 추가하는 컴포넌트
 * 랜딩페이지(/)는 정상 스크롤, safe-area 패딩 없음
 * 웹앱(/app)은 safe-area 패딩 적용, overflow 제어
 */
export default function AppBodyClass() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith('/app');

  useEffect(() => {
    if (isAppRoute) {
      // 웹앱: html과 body에 data-app="true" 추가
      document.documentElement.setAttribute('data-app', 'true');
      document.body.setAttribute('data-app', 'true');
    } else {
      // 랜딩페이지: data-app 제거
      document.documentElement.removeAttribute('data-app');
      document.body.removeAttribute('data-app');
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.removeAttribute('data-app');
      document.body.removeAttribute('data-app');
    };
  }, [isAppRoute]);

  return null;
}
