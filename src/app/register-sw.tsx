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
      // 🔄 개발 환경: 기존 Service Worker 완전히 제거하고 새로 등록 (캐시 문제 해결)
      if (process.env.NODE_ENV === 'development') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });

          // 기존 캐시도 모두 삭제
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.delete(cacheName);
            });
          });

          // 짧은 딜레이 후 새로 등록
          setTimeout(() => {
            navigator.serviceWorker
              .register('/sw.js', { updateViaCache: 'none' })
              .then((registration) => {
                logger.info('Service Worker registered:', registration);
              })
              .catch((error) => {
                logger.error('Service Worker registration failed:', error);
              });
          }, 100);
        });
      } else {
        // 🚀 프로덕션: 정상 등록 + 자동 업데이트
        navigator.serviceWorker
          .register('/sw.js', { updateViaCache: 'none' })
          .then((registration) => {
            logger.info('Service Worker registered:', registration);

            // 업데이트 확인
            registration.update();

            // 업데이트가 발견되면 자동 활성화
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    logger.info('Service Worker updated, reloading...');
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((error) => {
            logger.error('Service Worker registration failed:', error);
          });
      }
    }
  }, []);

  return null;
}
