'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Unified Service Worker 등록 컴포넌트
 *
 * 변경 사항 (2025-10-17):
 * - 기존 sw.js와 firebase-messaging-sw.js를 하나의 통합 SW로 대체
 * - Service Worker 충돌 문제 해결
 * - 등록 로직 간소화 (복잡한 상태 관리 제거)
 * - iOS PWA 호환성 개선
 *
 * 새로운 아키텍처:
 * - 단일 Service Worker (worker/index.js → public/sw.js)
 * - PWA 캐싱 + FCM 푸시 알림을 하나의 워커에서 처리
 * - Scope 충돌 없음 (단일 scope: '/')
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    // Service Worker가 지원되지 않으면 종료
    if (!('serviceWorker' in navigator)) {
      logger.warn('[RegisterSW] Service Worker not supported');
      return;
    }

    /**
     * Unified Service Worker 등록
     *
     * 간소화된 등록 프로세스:
     * 1. 기존 SW 모두 제거 (깨끗한 상태에서 시작)
     * 2. 새로운 통합 SW 등록
     * 3. 등록 완료 대기
     */
    const registerUnifiedServiceWorker = async () => {
      try {
        logger.info('[RegisterSW] Starting unified service worker registration...');

        // Step 1: 기존 Service Worker 모두 제거
        const registrations = await navigator.serviceWorker.getRegistrations();
        logger.info(`[RegisterSW] Found ${registrations.length} existing service worker(s)`);

        if (registrations.length > 0) {
          await Promise.all(
            registrations.map(async (registration) => {
              const url = registration.active?.scriptURL || 'unknown';
              logger.info(`[RegisterSW] Unregistering: ${url}`);
              await registration.unregister();
            })
          );
          logger.info('[RegisterSW] All existing service workers unregistered');
        }

        // Step 2: 새로운 통합 Service Worker 등록
        logger.info('[RegisterSW] Registering unified service worker at /sw.js');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        logger.info('[RegisterSW] Service worker registered successfully', {
          scope: registration.scope,
          state: registration.active
            ? 'active'
            : registration.waiting
            ? 'waiting'
            : registration.installing
            ? 'installing'
            : 'unknown',
        });

        // Step 3: Service Worker가 활성화될 때까지 대기
        await navigator.serviceWorker.ready;
        logger.info('[RegisterSW] Service worker is ready and active');

        // Step 4: 업데이트 체크 (개발 중에는 자주 업데이트됨)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          logger.info('[RegisterSW] Service worker update found');

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 버전이 설치되었고, 기존 워커가 아직 컨트롤 중
                logger.info('[RegisterSW] New service worker installed, waiting for activation');

                // 사용자에게 새로고침 유도 (선택사항)
                // if (confirm('새 버전이 있습니다. 새로고침하시겠습니까?')) {
                //   window.location.reload();
                // }
              }
            });
          }
        });

        // Optional: 주기적 업데이트 체크 (1시간마다)
        setInterval(() => {
          logger.info('[RegisterSW] Checking for service worker updates...');
          registration.update();
        }, 60 * 60 * 1000);
      } catch (error) {
        logger.error('[RegisterSW] Failed to register service worker', error);
      }
    };

    // 페이지 로드 완료 후 등록 (성능 최적화)
    if (document.readyState === 'complete') {
      registerUnifiedServiceWorker();
    } else {
      window.addEventListener('load', registerUnifiedServiceWorker);
      return () => {
        window.removeEventListener('load', registerUnifiedServiceWorker);
      };
    }
  }, []);

  return null;
}
