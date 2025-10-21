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
  getDeviceId,
} from '@/lib/firebase/messaging';
import { isPushEnabledForDevice, isPushEnabledForEndpoint } from '@/lib/push/helpers';
import { getCurrentWebPushSubscription } from '@/lib/firebase/webpush';
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
   * 알림 상태 확인
   * - Firestore를 단일 진실 소스(Single Source of Truth)로 사용
   * - ✅ endpoint 기반 체크 (localStorage 불필요, iOS Safari 안정적)
   * - iOS PWA 버그: Notification.permission이 불안정하므로 참고용으로만 사용
   * - 명시적으로 차단된 경우(denied)에만 자동 정리
   */
  const checkNotificationStatus = async (participantId: string) => {
    try {
      setIsStatusLoading(true);

      // 1. Firestore에서 participant 데이터 가져오기
      const participantRef = doc(getDb(), 'participants', participantId);
      const participantSnap = await getDoc(participantRef);

      if (!participantSnap.exists()) {
        logger.warn('[NotificationToggle] Participant not found', { participantId });
        setIsEnabled(false);
        return;
      }

      const data = participantSnap.data();

      // 2. ✅ pushNotificationEnabled 필드로 간단히 체크 (마스터 스위치)
      const isPushEnabled = data.pushNotificationEnabled !== false;

      logger.info('[NotificationToggle] Status check result', {
        participantId,
        pushNotificationEnabled: data.pushNotificationEnabled,
        isPushEnabled,
      });

      // 3. 토글 상태 업데이트
      setIsEnabled(isPushEnabled);

      // 4. 브라우저 권한 상태 확인 (참고용)
      const browserPermission = getNotificationPermission();

      // 5. 권한이 명시적으로 차단된 경우에만 정리
      // iOS PWA 버그 수정: permission이 'default'로 리셋되어도 알림은 동작할 수 있음
      if (isPushEnabled && browserPermission === 'denied') {
        logger.warn('[NotificationToggle] Permission explicitly denied. Cleaning up...', {
          browserPermission,
        });

        // ✅ 현재 디바이스의 FCM + Web Push 모두 제거
        await removePushTokenFromFirestore(participantId);

        setIsEnabled(false);
        logger.info('[NotificationToggle] Cleaned up after explicit permission denial');
      }
    } catch (error) {
      logger.error('[NotificationToggle] Error checking notification status', error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  /**
   * 알림 활성화
   * - 브라우저 권한 요청
   * - FCM 토큰 획득 및 Firestore 저장
   * - 완료 후 Firestore에서 상태 재확인하여 UI 동기화
   */
  const enableNotifications = async () => {
    if (!participantId) {
      logger.error('Cannot enable notifications: participantId not found');
      setErrorMessage('사용자 정보를 찾을 수 없습니다');
      return;
    }

    // Guard: 이미 로딩 중이거나 초기 상태 확인 중이면 무시
    if (isBusy) {
      logger.warn('[enableNotifications] Already in progress, ignoring');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      logger.info('[enableNotifications] Requesting notification permission...');

      // 1. 브라우저 알림 권한 요청
      const result = await Notification.requestPermission();
      setPermission(result);

      logger.info('[enableNotifications] Permission result:', result);

      if (result === 'denied') {
        setShowDeniedMessage(true);
        return;
      }

      if (result === 'granted') {
        logger.info('[enableNotifications] Permission granted, initializing push notifications...');

        // 2. FCM 지원 여부 확인 후 messaging 인스턴스 생성
        const { isFCMSupported } = await import('@/lib/firebase/webpush');
        const fcmSupported = await isFCMSupported();
        const messaging = fcmSupported ? getMessaging(getFirebaseApp()) : null;

        // 3. Push notifications 초기화 (FCM + Web Push)
        const initResult = await initializePushNotifications(messaging, participantId);

        if (!initResult) {
          throw new Error('Failed to initialize push notifications');
        }

        // 3. 토큰 획득 성공 - cleanup 저장
        setCleanup(() => initResult.cleanup);

        logger.info('[enableNotifications] Push notification initialized successfully');

        // 4. ✅ Firestore에서 상태 재확인하여 UI 동기화 (Single Source of Truth)
        // initializePushNotifications가 이미 pushNotificationEnabled: true로 설정함
        await checkNotificationStatus(participantId);

        logger.info('[enableNotifications] Notifications enabled successfully');
      }
    } catch (error) {
      logger.error('[enableNotifications] Error enabling notifications', error);
      setErrorMessage('알림 설정 중 오류가 발생했습니다. 다시 시도해주세요.');

      // 에러 발생 시 Firestore 상태 재확인하여 일관성 유지
      if (participantId) {
        await checkNotificationStatus(participantId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 알림 비활성화
   * - ✅ removePushTokenFromFirestore 사용 (pushTokens 배열 기반)
   * - FCM 토큰 삭제 (실패해도 non-critical)
   * - 완료 후 Firestore에서 상태 재확인하여 UI 동기화
   */
  const disableNotifications = async () => {
    if (!participantId) {
      logger.error('[disableNotifications] Cannot disable: participantId not found');
      return;
    }

    // Guard: 이미 로딩 중이거나 초기 상태 확인 중이면 무시
    if (isBusy) {
      logger.warn('[disableNotifications] Already in progress, ignoring');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. ✅ 현재 디바이스의 토큰을 pushTokens 배열에서 제거
      // removePushTokenFromFirestore가 pushNotificationEnabled 플래그도 관리함
      await removePushTokenFromFirestore(participantId);

      logger.info('[disableNotifications] Push token removed from Firestore');

      // 2. FCM 토큰 삭제 시도 (실패해도 무시)
      try {
        const messaging = getMessaging(getFirebaseApp());
        await deleteToken(messaging);
        logger.info('[disableNotifications] FCM token deleted');
      } catch (tokenError) {
        logger.warn('[disableNotifications] Failed to delete FCM token (non-critical)', tokenError);
        // iOS PWA에서는 실패할 수 있음 - 무시하고 계속
      }

      // 3. Cleanup listener
      if (cleanup) {
        cleanup();
        setCleanup(null);
      }

      // 4. Firestore에서 상태 재확인하여 UI 동기화 (Single Source of Truth)
      await checkNotificationStatus(participantId);

      logger.info('[disableNotifications] Notifications disabled successfully');
    } catch (error) {
      logger.error('[disableNotifications] Error disabling notifications', error);
      setErrorMessage('알림 해제 중 오류가 발생했습니다. 다시 시도해주세요.');

      // 에러 발생 시 Firestore 상태 재확인하여 일관성 유지
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
    // Guard: 로딩 중이거나 초기 상태 확인 중이면 무시
    if (isBusy) {
      logger.warn('[handleToggle] Blocked: loading in progress');
      return;
    }

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
