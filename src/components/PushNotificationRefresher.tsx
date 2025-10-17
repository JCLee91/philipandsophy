'use client';

import { useEffect } from 'react';
import { getMessaging } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';
import { autoRefreshPushToken, isPushNotificationSupported } from '@/lib/firebase/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

/**
 * Push Notification 토큰 자동 갱신 컴포넌트
 *
 * iOS PWA 버그 수정: 7일 경과 시 자동으로 토큰 갱신
 * - 앱 진입 시 자동으로 토큰 갱신 체크
 * - 7일이 지난 토큰만 갱신
 * - 백그라운드에서 조용히 실행 (UI 없음)
 *
 * @see src/lib/firebase/messaging.ts - autoRefreshPushToken()
 */
export function PushNotificationRefresher() {
  const { participant } = useAuth();

  useEffect(() => {
    if (!participant?.id) return;
    if (!isPushNotificationSupported()) return;

    // 앱 진입 시 토큰 갱신 체크 (7일 경과 시 자동 갱신)
    const refreshToken = async () => {
      try {
        logger.info('[PushNotificationRefresher] Checking token refresh...');
        const messaging = getMessaging(getFirebaseApp());
        await autoRefreshPushToken(messaging, participant.id);
      } catch (error) {
        logger.error('[PushNotificationRefresher] Failed to refresh token', error);
        // 에러가 발생해도 무시 (사용자 경험에 영향 없음)
      }
    };

    refreshToken();
  }, [participant?.id]);

  return null; // UI 없음 (백그라운드 작업)
}
