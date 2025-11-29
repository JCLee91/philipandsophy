'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 페이지 타입에 따라 html과 body에 데이터 속성을 추가하는 컴포넌트
 * - 랜딩페이지(/): data-landing="true" - 검정색 배경, 정상 스크롤, safe-area 패딩 없음
 * - 웹앱(/app): data-app="true" - safe-area 패딩 적용, overflow 제어
 */
export default function AppBodyClass() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith('/app');
  const isLandingPage = pathname === '/' || pathname === '/service' || pathname === '/membership' || pathname === '/program' || pathname === '/party-reviews' || pathname === '/secret-party' || pathname?.startsWith('/application');

  useEffect(() => {
    if (isAppRoute) {
      // 웹앱: html과 body에 data-app="true" 추가
      document.documentElement.setAttribute('data-app', 'true');
      document.body.setAttribute('data-app', 'true');
      document.documentElement.removeAttribute('data-landing');
      document.body.removeAttribute('data-landing');
    } else if (isLandingPage) {
      // 랜딩페이지: html과 body에 data-landing="true" 추가
      document.documentElement.setAttribute('data-landing', 'true');
      document.body.setAttribute('data-landing', 'true');
      document.documentElement.removeAttribute('data-app');
      document.body.removeAttribute('data-app');
    } else {
      // 기타 페이지: 모든 속성 제거
      document.documentElement.removeAttribute('data-app');
      document.body.removeAttribute('data-app');
      document.documentElement.removeAttribute('data-landing');
      document.body.removeAttribute('data-landing');
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.removeAttribute('data-app');
      document.body.removeAttribute('data-app');
      document.documentElement.removeAttribute('data-landing');
      document.body.removeAttribute('data-landing');
    };
  }, [isAppRoute, isLandingPage]);

  return null;
}
