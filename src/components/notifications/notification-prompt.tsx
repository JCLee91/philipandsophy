'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { getMessaging } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';
import { initializePushNotifications } from '@/lib/firebase/messaging';
import { logger } from '@/lib/logger';

/**
 * 알림 권한 요청 프롬프트 컴포넌트
 * 사용자에게 브라우저 알림 권한을 요청하고 FCM 토큰을 저장합니다.
 */
export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // localStorage에서 participantId 가져오기
  useEffect(() => {
    const storedParticipantId = localStorage.getItem('participantId');
    if (storedParticipantId) {
      setParticipantId(storedParticipantId);
      logger.info('Participant ID loaded from localStorage', { participantId: storedParticipantId });
    }
  }, []);

  useEffect(() => {
    console.log('[NotificationPrompt] Component mounted');

    // 브라우저가 알림을 지원하는지 확인
    if (!('Notification' in window)) {
      console.log('[NotificationPrompt] Notification API not supported');
      return;
    }

    console.log('[NotificationPrompt] Current permission:', Notification.permission);

    // 현재 알림 권한 상태 확인
    setPermission(Notification.permission);

    // 권한이 아직 결정되지 않았고, 사용자가 이전에 거부하지 않았다면 프롬프트 표시
    const hasDeclinedBefore = localStorage.getItem('notification-declined');
    console.log('[NotificationPrompt] Has declined before:', hasDeclinedBefore);

    if (Notification.permission === 'default' && !hasDeclinedBefore) {
      console.log('[NotificationPrompt] Will show prompt in 3 seconds');
      // 페이지 로드 후 3초 뒤에 프롬프트 표시
      const timer = setTimeout(() => {
        console.log('[NotificationPrompt] Showing prompt now');
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      console.log('[NotificationPrompt] Will NOT show prompt - permission:', Notification.permission, 'hasDeclined:', hasDeclinedBefore);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!participantId) {
      logger.error('Cannot initialize push notifications: participantId not found');
      return;
    }

    try {
      setIsInitializing(true);

      // 1. 브라우저 알림 권한 요청
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {
        logger.info('Notification permission granted, initializing FCM...');

        // 2. Firebase Messaging 초기화 및 FCM 토큰 저장
        const messaging = getMessaging(getFirebaseApp());
        const token = await initializePushNotifications(messaging, participantId);

        if (token) {
          logger.info('Push notifications initialized successfully', {
            participantId,
            tokenPrefix: token.substring(0, 20) + '...'
          });

          // 3. 테스트 알림 전송
          new Notification('필립앤소피', {
            body: '알림이 활성화되었습니다 🎉',
            icon: '/image/favicon.webp',
            badge: '/image/favicon.webp',
          });
        } else {
          logger.error('Failed to get FCM token');
        }
      } else {
        logger.warn('Notification permission denied', { result });
      }
    } catch (error) {
      logger.error('Error requesting notification permission', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-declined', 'true');
  };

  // 프롬프트를 표시하지 않는 경우
  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 md:left-auto md:right-4 md:w-96">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-900" />
              <h3 className="font-bold text-gray-900">알림 허용</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              새로운 메시지와 공지사항을 실시간으로 받아보세요
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRequestPermission}
                disabled={isInitializing}
                className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? '설정 중...' : '허용'}
              </button>
              <button
                onClick={handleDismiss}
                disabled={isInitializing}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                나중에
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            disabled={isInitializing}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
