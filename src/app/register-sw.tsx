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
/**
 * Wait for Service Worker to control the page
 *
 * iOS PWA에서 컨트롤러 전환이 느릴 수 있으므로
 * controllerchange 이벤트를 대기합니다.
 */
async function waitForController(timeoutMs: number = 5000): Promise<void> {
  // 이미 컨트롤러가 있으면 즉시 반환
  if (navigator.serviceWorker.controller) {
    logger.info('[RegisterSW] Controller already active');
    return;
  }

  logger.info('[RegisterSW] Waiting for controller...');

  // ✅ 리스너 정리를 위한 변수
  let onControllerChange: (() => void) | null = null;

  return Promise.race([
    new Promise<void>((resolve) => {
      onControllerChange = () => {
        if (navigator.serviceWorker.controller) {
          logger.info('[RegisterSW] Controller activated via event');
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }),
    new Promise<void>((_, reject) => {
      setTimeout(() => {
        logger.warn('[RegisterSW] Controller timeout - continuing anyway');
        reject(new Error('Controller timeout'));
      }, timeoutMs);
    }),
  ])
    .then(() => {
      // ✅ 성공 시 리스너 정리
      if (onControllerChange) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
    })
    .catch(() => {
      // ✅ 타임아웃 시에도 리스너 정리
      if (onControllerChange) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
      logger.warn('[RegisterSW] Proceeding without controller');
    });
}

export default function RegisterServiceWorker() {
  useEffect(() => {
    // Service Worker가 지원되지 않으면 종료
    if (!('serviceWorker' in navigator)) {
      logger.warn('[RegisterSW] Service Worker not supported');
      return;
    }

    // ✅ cleanup을 위한 변수들
    let updateIntervalId: NodeJS.Timeout | null = null;

    /**
     * Unified Service Worker 등록
     *
     * iOS PWA 최적화 프로세스:
     * 1. 기존 등록 재사용 (재등록 금지)
     * 2. 없으면 새로 등록
     * 3. 컨트롤러 확보 대기 (controllerchange 이벤트)
     */
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, version } = event.data || {};
      if (!type) return;

      switch (type) {
        case 'SW_INSTALLING':
          logger.info('[RegisterSW] Service worker installing', { version });
          break;
        case 'SW_ACTIVATED':
          logger.info('[RegisterSW] Service worker activated', { version });
          try {
            window.localStorage.setItem('pns-sw-version', version || 'unknown');
          } catch (error) {
            logger.warn('[RegisterSW] Failed to persist sw version', error);
          }
          window.dispatchEvent(new CustomEvent('pns-sw-activated', { detail: { version } }));
          break;
        default:
          logger.debug('[RegisterSW] Received service worker message', { type, version });
      }
    };

    const registerUnifiedServiceWorker = async () => {
      try {
        logger.info('[RegisterSW] Starting service worker registration...');

        // Step 1: 기존 등록 확인 (있으면 재사용)
        let registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
          logger.info('[RegisterSW] Service worker already registered', {
            scope: registration.scope,
            state: registration.active?.state || 'no active worker',
          });
        } else {
          // Step 2: 없으면 새로 등록
          logger.info('[RegisterSW] Registering new service worker at /sw.js');
          registration = await navigator.serviceWorker.register('/sw.js', {
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
        }

        // Step 3: 컨트롤러 확보 대기 (iOS 최적화)
        await waitForController(5000);
        logger.info('[RegisterSW] Service worker controller ready');

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

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
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        // ✅ 주기적 업데이트 체크 (1시간마다) - cleanup을 위해 ID 저장
        updateIntervalId = setInterval(() => {
          logger.info('[RegisterSW] Checking for service worker updates...');
          registration.update();
        }, 60 * 60 * 1000);
      } catch (error) {
        logger.error('[RegisterSW] Failed to register service worker', error);
      }
    };

    // ✅ PWABuilder 권장: 가능한 한 빨리 등록 (즉시 실행)
    // iOS PWA에서 홈 화면으로 열면 이미 load가 끝난 상태이므로 즉시 등록
    registerUnifiedServiceWorker();

    // ✅ Cleanup function
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);

      // setInterval 정리
      if (updateIntervalId) {
        clearInterval(updateIntervalId);
        logger.info('[RegisterSW] Cleared update interval');
      }
    };
  }, []);

  return null;
}
