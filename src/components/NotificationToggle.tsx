'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, Loader2 } from 'lucide-react';
import { getMessaging, deleteToken } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import {
  initializePushNotifications,
  isPushNotificationSupported,
  getNotificationPermission,
  removePushTokenFromFirestore,
  detectPushChannel,
} from '@/lib/firebase/messaging';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 알림 토글 컴포넌트
 * - 알림 on/off 상태 표시 및 변경
 * - FCM 토큰 저장/삭제
 * - 브라우저 권한 상태 처리
 */
export function NotificationToggle() {
  const { participant } = useAuth();
  const participantId = participant?.id;

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true); // Initial load state
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showDeniedMessage, setShowDeniedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);
  const isBusy = isLoading || isStatusLoading;

  // Check current notification status
  useEffect(() => {
    if (participantId) {
      checkNotificationStatus(participantId);
    }

    if (isPushNotificationSupported()) {
      setPermission(Notification.permission);
    }
  }, [participantId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [cleanup]);

  /**
   * 알림 상태 확인 (단순화 버전)
   * - pushNotificationEnabled 필드만 확인
   * - 브라우저 권한이 denied면 자동 정리
   */
  const checkNotificationStatus = async (participantId: string) => {
    try {
      setIsStatusLoading(true);

      const participantRef = doc(getDb(), 'participants', participantId);
      const participantSnap = await getDoc(participantRef);

      if (!participantSnap.exists()) {
        logger.warn('[NotificationToggle] Participant not found', { participantId });
        setIsEnabled(false);
        return;
      }

      const data = participantSnap.data();
      const isPushEnabled = data.pushNotificationEnabled === true;

      logger.info('[NotificationToggle] Status check', {
        participantId,
        pushNotificationEnabled: isPushEnabled,
      });

      setIsEnabled(isPushEnabled);

      // 브라우저 권한이 명시적으로 denied면 정리
      if (isPushEnabled && getNotificationPermission() === 'denied') {
        logger.warn('[NotificationToggle] Permission denied, cleaning up');
        await removePushTokenFromFirestore(participantId);
        setIsEnabled(false);
      }
    } catch (error) {
      logger.error('[NotificationToggle] Error checking status', error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  /**
   * 알림 활성화 (단순화 버전)
   * - 권한 요청 → 플랫폼별 초기화 → 상태 확인
   */
  const enableNotifications = async () => {
    if (!participantId) {
      setErrorMessage('사용자 정보를 찾을 수 없습니다');
      return;
    }

    if (isBusy) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. 권한 요청
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'denied') {
        setShowDeniedMessage(true);
        return;
      }

      if (result === 'granted') {
        // 2. 플랫폼별 초기화
        const channel = detectPushChannel();

        let messaging = null;
        if (channel === 'fcm') {
          const { isFCMSupported } = await import('@/lib/firebase/webpush');
          if (await isFCMSupported()) {
            messaging = getMessaging(getFirebaseApp());
          }
        }

        const initResult = await initializePushNotifications(messaging, participantId);
        if (!initResult) {
          throw new Error('Push initialization failed');
        }

        setCleanup(() => initResult.cleanup);

        // 3. 상태 재확인
        await checkNotificationStatus(participantId);
      }
    } catch (error) {
      logger.error('[enableNotifications] Error', error);
      setErrorMessage('알림 설정 중 오류가 발생했습니다');
      if (participantId) {
        await checkNotificationStatus(participantId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 알림 비활성화 (단순화 버전)
   * - Firestore에서 토큰 제거 → FCM 삭제 시도 → 상태 확인
   */
  const disableNotifications = async () => {
    if (!participantId || isBusy) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const channel = detectPushChannel();

      // 1. 채널별 토큰/구독 제거
      if (channel === 'fcm') {
        // FCM: Firestore에서 토큰 제거
        await removePushTokenFromFirestore(participantId);

        // FCM 서버에서도 토큰 삭제 시도
        try {
          const messaging = getMessaging(getFirebaseApp());
          await deleteToken(messaging);
        } catch (error) {
          logger.warn('[disableNotifications] FCM delete failed (non-critical)', error);
        }
      } else if (channel === 'webpush') {
        // Web Push: 로컬 Firestore + PushSubscription 제거
        // (removePushTokenFromFirestore가 webPushSubscriptions도 제거)
        await removePushTokenFromFirestore(participantId);
      }

      // 2. Cleanup
      if (cleanup) {
        cleanup();
        setCleanup(null);
      }

      // 3. 상태 재확인
      await checkNotificationStatus(participantId);
    } catch (error) {
      logger.error('[disableNotifications] Error', error);
      setErrorMessage('알림 해제 중 오류가 발생했습니다');
      if (participantId) {
        await checkNotificationStatus(participantId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 토글 핸들러
   */
  const handleToggle = async () => {
    if (isBusy) return;

    if (isEnabled) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  };

  // Check if running in PWA/standalone mode
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://'));

  // Browser tab - show install message (gray text only, no toggle)
  if (!isStandalone) {
    return (
      <p className="text-sm text-gray-500">
        홈 화면에 추가 후 알림 사용 가능
      </p>
    );
  }

  // No user logged in
  if (!participantId) {
    return (
      <p className="text-sm text-gray-500">
        로그인 후 알림 설정이 가능합니다
      </p>
    );
  }

  // Push notification not supported
  if (!isPushNotificationSupported()) {
    return (
      <p className="text-sm text-gray-500">
        홈 화면에 추가 후 알림 사용 가능
      </p>
    );
  }

  // Error message
  if (errorMessage) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 mb-1">
              오류
            </p>
            <p className="text-sm text-red-700 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setErrorMessage(null)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    );
  }

  // Permission denied by browser
  if (permission === 'denied' && showDeniedMessage) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 mb-1">
              알림 권한이 차단되었습니다
            </p>
            <p className="text-sm text-red-700 leading-relaxed">
              브라우저 설정에서 필립앤소피의 알림 권한을 허용해주세요
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDeniedMessage(false)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isEnabled ? (
          <Bell className="h-5 w-5 text-gray-900" />
        ) : (
          <BellOff className="h-5 w-5 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">
            푸시 알림
          </p>
          <p className="text-xs text-gray-500">
            {isEnabled ? '새 메시지와 공지를 받고 있습니다' : '알림을 받지 않습니다'}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="relative h-6 w-11">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isBusy}
          className={`absolute inset-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-normal ${
            isEnabled ? 'bg-black' : 'bg-gray-200'
          } ${isBusy ? 'cursor-default opacity-0' : 'cursor-pointer'}`}
          role="switch"
          aria-checked={isEnabled}
          aria-label="푸시 알림 토글"
          aria-busy={isBusy}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-normal ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}
