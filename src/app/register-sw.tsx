'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Service Worker 등록 컴포넌트
 * PWA 기능을 활성화하기 위해 클라이언트 측에서 Service Worker를 등록합니다.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered:', registration);

          // 개발 환경에서 Service Worker 자동 업데이트
          if (process.env.NODE_ENV === 'development') {
            registration.update();
          }
        })
        .catch((error) => {
          logger.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
