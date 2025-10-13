'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { getMessaging } from 'firebase/messaging';
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
import { useSession } from '@/hooks/use-session';

/**
 * 알림 토글 컴포넌트
 * - 알림 on/off 상태 표시 및 변경
 * - FCM 토큰 저장/삭제
 * - 브라우저 권한 상태 처리
 */
export function NotificationToggle() {
  const { currentUser } = useSession();
  const participantId = currentUser?.id;

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showDeniedMessage, setShowDeniedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check current notification status
  useEffect(() => {
    if (participantId) {
      checkNotificationStatus(participantId);
    }

    if (isPushNotificationSupported()) {
      setPermission(Notification.permission);
    }
  }, [participantId]);

  /**
   * 알림 상태 확인
   * - Firestore에 pushToken이 있으면 활성화 상태
   */
  const checkNotificationStatus = async (participantId: string) => {
    try {
      const token = await getPushTokenFromFirestore(participantId);
      setIsEnabled(!!token);
    } catch (error) {
      logger.error('Error checking notification status', error);
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
        const token = await initializePushNotifications(messaging, participantId);

        if (token) {
          setIsEnabled(true);
          logger.info('Notifications enabled successfully');

          // 3. 성공 알림 표시
          new Notification('필립앤소피', {
            body: '알림이 활성화되었습니다 🎉',
            icon: '/image/favicon.webp',
          });
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
   * - Firestore에서 pushToken 제거
   */
  const disableNotifications = async () => {
    if (!participantId) {
      logger.error('Cannot disable notifications: participantId not found');
      return;
    }

    try {
      setIsLoading(true);

      // Firestore에서 pushToken 필드 삭제
      const participantRef = doc(getDb(), 'participants', participantId);
      await updateDoc(participantRef, {
        pushToken: null,
        pushTokenUpdatedAt: null,
      });

      setIsEnabled(false);
      logger.info('Notifications disabled successfully');
    } catch (error) {
      logger.error('Error disabling notifications', error);
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
