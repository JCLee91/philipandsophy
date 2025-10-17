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
      // 기존 sw.js 제거 (캐싱 충돌 방지)
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          if (registration.active?.scriptURL.includes('/sw.js')) {
            registration.unregister();
            logger.info('Unregistered sw.js to avoid HMR conflicts');
          }
        });
      });

      // PWA 캐시만 선택적으로 삭제 (Firestore 캐시 보호)
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          // workbox 또는 next-pwa 캐시만 삭제
          if (cacheName.startsWith('workbox-') || cacheName.startsWith('next-')) {
            caches.delete(cacheName);
            logger.info('Deleted PWA cache:', cacheName);
          }
        });
      });

      // ⚠️ Note: firebase-messaging-sw.js는 Firebase SDK에서 자동 등록됨
      // usePushNotifications 훅에서 getToken() 호출 시 자동으로 등록
      logger.info('Service Worker cleanup completed. Firebase Messaging SW will be auto-registered by Firebase SDK.');
    }
  }, []);

  return null;
}
