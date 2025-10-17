'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { getMessaging, deleteToken } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';
import {
  initializePushNotifications,
  isPushNotificationSupported,
  getNotificationPermission,
  getPushTokenFromFirestore
} from '@/lib/firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
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
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showDeniedMessage, setShowDeniedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);

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
   * - Firestore pushToken을 단일 진실 소스(Single Source of Truth)로 사용
   * - iOS PWA 버그: Notification.permission이 불안정하므로 참고용으로만 사용
   * - 명시적으로 차단된 경우(denied)에만 자동 정리
   */
  const checkNotificationStatus = async (participantId: string) => {
    try {
      // 1. Firestore에서 토큰 확인 (단일 진실 소스)
      const token = await getPushTokenFromFirestore(participantId);

      // 2. 토큰이 있으면 활성화로 간주 (iOS PWA 버그 회피)
      setIsEnabled(!!token);

      // 3. 브라우저 권한 상태 확인 (참고용)
      const browserPermission = getNotificationPermission();

      // 4. 권한이 명시적으로 차단된 경우에만 정리
      // iOS PWA 버그 수정: permission이 'default'로 리셋되어도 알림은 동작할 수 있음
      if (token && browserPermission === 'denied') {
        logger.warn('[NotificationToggle] Permission explicitly denied. Cleaning up...', {
          browserPermission,
          hasToken: !!token,
        });

        // Firestore에서 토큰 정리
        const participantRef = doc(getDb(), 'participants', participantId);
        await updateDoc(participantRef, {
          pushToken: null,
          pushTokenUpdatedAt: null,
          pushNotificationEnabled: false,
        });

        setIsEnabled(false);
        logger.info('[NotificationToggle] Cleaned up after explicit permission denial');
      }
    } catch (error) {
      logger.error('[NotificationToggle] Error checking notification status', error);
    }
  };

  /**
   * 알림 활성화
   * - 브라우저 권한 요청
   * - FCM 토큰 획득 및 Firestore 저장
   */
  const enableNotifications = async () => {
    if (!participantId) {
      logger.error('Cannot enable notifications: participantId not found');
      setErrorMessage('사용자 정보를 찾을 수 없습니다');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      logger.info('Requesting notification permission...');

      // 1. 브라우저 알림 권한 요청
      const result = await Notification.requestPermission();
      setPermission(result);

      logger.info('Permission result:', result);

      if (result === 'denied') {
        setShowDeniedMessage(true);
        return;
      }

      if (result === 'granted') {
        logger.info('Permission granted, initializing FCM...');

        // 2. FCM 토큰 획득 및 저장
        const messaging = getMessaging(getFirebaseApp());
        const initResult = await initializePushNotifications(messaging, participantId);

        if (initResult) {
          setCleanup(() => initResult.cleanup);

          // 3. Firestore에 사용자가 알림을 활성화했음을 기록
          const participantRef = doc(getDb(), 'participants', participantId);
          await updateDoc(participantRef, {
            pushNotificationEnabled: true,
          });

          setIsEnabled(true);
          logger.info('Notifications enabled successfully');
        } else {
          logger.error('Failed to get FCM token');
          setErrorMessage('알림 토큰을 가져올 수 없습니다. 다시 시도해주세요.');
        }
      }
    } catch (error) {
      logger.error('Error enabling notifications', error);
      setErrorMessage('알림 설정 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 알림 비활성화
   * - Firestore 업데이트 우선 (단일 진실 소스)
   * - FCM 토큰 삭제 (실패해도 non-critical)
   * - 에러 시에도 사용자 의도(OFF) 존중
   */
  const disableNotifications = async () => {
    if (!participantId) {
      logger.error('[NotificationToggle] Cannot disable: participantId not found');
      return;
    }

    try {
      setIsLoading(true);

      // 1. 먼저 Firestore 업데이트 (가장 중요!)
      const participantRef = doc(getDb(), 'participants', participantId);
      await updateDoc(participantRef, {
        pushToken: null,
        pushTokenUpdatedAt: null,
        pushNotificationEnabled: false,
      });

      // 2. UI 즉시 업데이트 (Firestore 성공 시)
      setIsEnabled(false);
      logger.info('[NotificationToggle] Firestore updated, notification disabled');

      // 3. FCM 토큰 삭제 시도 (실패해도 무시)
      try {
        const messaging = getMessaging(getFirebaseApp());
        await deleteToken(messaging);
        logger.info('[NotificationToggle] FCM token deleted');
      } catch (tokenError) {
        logger.warn('[NotificationToggle] Failed to delete FCM token (non-critical)', tokenError);
        // iOS PWA에서는 실패할 수 있음 - 무시하고 계속
      }

      // 4. Cleanup listener
      if (cleanup) {
        cleanup();
        setCleanup(null);
      }

    } catch (error) {
      logger.error('[NotificationToggle] Error disabling notifications', error);

      // 에러 시에도 사용자 의도(OFF) 유지
      setIsEnabled(false);
      setErrorMessage('알림 해제 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 토글 핸들러
   */
  const handleToggle = async () => {
    if (isLoading) return;

    if (isEnabled) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  };

  // No user logged in
  if (!participantId) {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
        <AlertCircle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            로그인 후 알림 설정이 가능합니다
          </p>
        </div>
      </div>
    );
  }

  // Push notification not supported
  if (!isPushNotificationSupported()) {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
        <AlertCircle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            이 브라우저는 알림을 지원하지 않습니다
          </p>
        </div>
      </div>
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
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-normal ${
          isEnabled ? 'bg-black' : 'bg-gray-200'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        role="switch"
        aria-checked={isEnabled}
        aria-label="푸시 알림 토글"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-normal ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
