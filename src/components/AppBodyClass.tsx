'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 페이지 타입에 따라 html과 body에 데이터 속성을 추가하는 컴포넌트
 * - 랜딩페이지(/): data-landing="true" - 검정색 배경, 정상 스크롤, safe-area 패딩 없음
 * - 설문페이지(/application): data-survey="true" - 검정색 배경, 스크롤 잠금 (모바일 최적화)
 * - 웹앱(/app): data-app="true" - safe-area 패딩 적용, overflow 제어
 */
export default function AppBodyClass() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith('/app');
  const isSurveyPage = pathname?.startsWith('/application');
  const isLandingPage = !isSurveyPage && (pathname === '/' || pathname === '/service' || pathname === '/membership' || pathname === '/program' || pathname === '/party-reviews' || pathname === '/secret-party');

  useEffect(() => {
    // 모든 속성 초기화
    const resetAttributes = () => {
      document.documentElement.removeAttribute('data-app');
      document.body.removeAttribute('data-app');
      document.documentElement.removeAttribute('data-landing');
      document.body.removeAttribute('data-landing');
      document.documentElement.removeAttribute('data-survey');
      document.body.removeAttribute('data-survey');
    };

    resetAttributes();

    if (isAppRoute) {
      // 웹앱
      document.documentElement.setAttribute('data-app', 'true');
      document.body.setAttribute('data-app', 'true');
    } else if (isSurveyPage) {
      // 설문 페이지 (New)
      document.documentElement.setAttribute('data-survey', 'true');
      document.body.setAttribute('data-survey', 'true');
    } else if (isLandingPage) {
      // 랜딩페이지
      document.documentElement.setAttribute('data-landing', 'true');
      document.body.setAttribute('data-landing', 'true');
    }

    // Cleanup on unmount
    return () => {
      resetAttributes();
    };
  }, [isAppRoute, isLandingPage, isSurveyPage]);

  return null;
}
