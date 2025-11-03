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
 * Wait for Service Worker to control the page (non-blocking)
 *
 * iOS PWA에서 컨트롤러 전환이 느릴 수 있으므로
 * controllerchange 이벤트를 대기하되, 짧은 타임아웃으로 앱 블로킹 방지
 */
async function waitForController(timeoutMs: number = 300): Promise<void> {
  // 이미 컨트롤러가 있으면 즉시 반환
  if (navigator.serviceWorker.controller) {
    return;
  }

  // ✅ 리스너 정리를 위한 변수
  let onControllerChange: (() => void) | null = null;

  return Promise.race([
    new Promise<void>((resolve) => {
      onControllerChange = () => {
        if (navigator.serviceWorker.controller) {
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        // 타임아웃 시 에러 대신 resolve (앱 블로킹 방지)
        resolve();
      }, timeoutMs);
    }),
  ])
    .then(() => {
      // ✅ 성공 또는 타임아웃 시 리스너 정리
      if (onControllerChange) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
    });
}

export default function RegisterServiceWorker() {
  useEffect(() => {
    // Service Worker가 지원되지 않으면 종료
    if (!('serviceWorker' in navigator)) {

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

          break;
        case 'SW_ACTIVATED':

          try {
            window.localStorage.setItem('pns-sw-version', version || 'unknown');
          } catch (error) {

          }
          window.dispatchEvent(new CustomEvent('pns-sw-activated', { detail: { version } }));
          break;
        default:

      }
    };

    const registerUnifiedServiceWorker = async () => {
      try {

        // Step 1: 기존 등록 확인 (있으면 재사용)
        let registration = await navigator.serviceWorker.getRegistration();

        if (registration) {

        } else {
          // Step 2: 없으면 새로 등록

          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

        }

        // Step 3: 컨트롤러 확보 대기 (비차단, 300ms 타임아웃)
        await waitForController(300);

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        // Step 4: 업데이트 체크 (개발 중에는 자주 업데이트됨)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 버전이 설치되었고, 기존 워커가 아직 컨트롤 중

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

          registration.update();
        }, 60 * 60 * 1000);
      } catch (error) {

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

      }
    };
  }, []);

  return null;
}
