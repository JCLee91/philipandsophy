'use client';

import { useEffect } from 'react';

function updateViewportVariables() {
  const viewport = typeof window !== 'undefined' ? window.visualViewport : null;

  // iOS PWA 감지
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSPWA = isIOS && isPWA;

  // 실제 높이 계산 (iOS PWA에서 더 정확)
  const height = window.innerHeight;

  const root = document.documentElement;

  // 실제 높이 저장 (100vh 대신 사용)
  root.style.setProperty('--app-real-height', `${height}px`);
  root.style.setProperty('--app-viewport-height', `${viewport?.height ?? height}px`);

  // iOS PWA 클래스 추가
  if (isIOSPWA) {
    document.documentElement.classList.add('ios-pwa');
  }
}

export default function AppViewportEffect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      updateViewportVariables();

      // iOS PWA에서 다이얼로그 관련 버그 수정을 위한 추가 처리
      const isIOSPWA = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
                       window.matchMedia('(display-mode: standalone)').matches;

      if (isIOSPWA) {
        // 미세한 딜레이 후 재계산 (iOS 렌더링 버그 대응)
        requestAnimationFrame(() => {
          updateViewportVariables();
        });
      }
    };

    updateViewportVariables();

    // 모든 가능한 이벤트에 리스너 추가
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', handleResize);
    viewport?.addEventListener('scroll', handleResize);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      viewport?.removeEventListener('resize', handleResize);
      viewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, []);

  return null;
}
