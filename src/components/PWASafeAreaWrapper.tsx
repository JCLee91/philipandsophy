'use client';

import { useEffect, useState } from 'react';

interface PWASafeAreaWrapperProps {
  children: React.ReactNode;
}

/**
 * PWA Safe Area Wrapper
 *
 * PWA standalone 모드(홈화면에서 실행)일 때만 Safe Area 패딩을 적용합니다.
 * 브라우저에서는 아무런 영향을 주지 않습니다.
 *
 * - 적용 대상: /app/* 경로 (웹앱)
 * - 제외 대상: / (랜딩페이지), /program (프로그램 소개)
 */
export default function PWASafeAreaWrapper({ children }: PWASafeAreaWrapperProps) {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // PWA standalone 모드 감지
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(isStandalone);
  }, []);

  return (
    <div className={isPWA ? 'pwa-safe-area' : ''}>
      {children}
      <style jsx>{`
        .pwa-safe-area {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
