'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { getMessaging } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';
import { initializePushNotifications } from '@/lib/firebase/messaging';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { UI_CONSTANTS } from '@/constants/ui';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 알림 권한 요청 프롬프트 컴포넌트
 * 사용자에게 브라우저 알림 권한을 요청하고 푸시 알림을 활성화합니다.
 *
 * 수정 사항 (2025-10-21):
 * - ✅ isPushEnabledForDevice 통합 헬퍼 사용 (FCM + Web Push 모두 확인)
 * - ✅ iOS Safari Web Push 구독도 올바르게 감지
 * - ✅ useAuth()로 participant 직접 사용 (localStorage 의존성 제거)
 * - ✅ participantStatus 기반 상태 관리
 * - Firestore에서 현재 디바이스 푸시 상태 확인하여 이미 허용된 사용자는 프롬프트 표시 안 함
 * - 사용자 피드백 강화
 */
export function NotificationPrompt() {
  // ✅ AuthContext에서 participant 직접 가져오기
  const { participant, participantStatus } = useAuth();

  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isInitializing, setIsInitializing] = useState(false);
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // ✅ participant에서 participantId 추출 (localStorage 제거)
  const participantId = participant?.id ?? null;

  // Firestore에서 pushToken 확인 후 프롬프트 표시 여부 결정
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const checkAndShowPrompt = async () => {

      // 브라우저가 알림을 지원하는지 확인
      if (!('Notification' in window)) {

        setIsCheckingToken(false);
        return;
      }

      // 데스크탑에서는 표시하지 않음 - 모바일과 태블릿만 허용
      // PWA로 설치된 경우도 체크
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // 모바일 기기가 아니고, PWA도 아니고, 터치 기기도 아니면 표시하지 않음
      if (!isMobileDevice && !isStandalone && !isTouchDevice) {
        setIsCheckingToken(false);
        return;
      }

      // 현재 알림 권한 상태 확인
      setPermission(Notification.permission);

      // ✅ participantStatus가 'ready'이고 participantId가 있을 때만 진행
      if (participantStatus !== 'ready' || !participantId) {

        setIsCheckingToken(false);
        return;
      }

      try {
        // 1. Firestore에서 푸시 토큰 존재 여부 확인 (단순화)
        const participantRef = doc(getDb(), 'participants', participantId);
        const participantSnap = await getDoc(participantRef);

        if (participantSnap.exists()) {
          const data = participantSnap.data();

          // ✅ 단순화: 토큰/구독 배열이 비어있지 않으면 이미 설정됨
          const pushTokens = Array.isArray(data.pushTokens) ? data.pushTokens : [];
          const webPushSubs = Array.isArray(data.webPushSubscriptions) ? data.webPushSubscriptions : [];
          const hasAnyToken = pushTokens.length > 0 || webPushSubs.length > 0;

          if (hasAnyToken) {

            setIsCheckingToken(false);
            return;
          }
        }

        // 2. 조건: Firestore에 토큰 없음 (localStorage 무시)
        // - permission 상관없이 Firestore 기준으로만 판단
        // - "나중에" 클릭해도 다음번에 또 프롬프트 표시 (설정에서 끄면 됨)

        // 페이지 로드 후 일정 시간 뒤에 프롬프트 표시
        const timer = setTimeout(() => {

          setShowPrompt(true);
          setIsCheckingToken(false);
        }, UI_CONSTANTS.NOTIFICATION_PROMPT_DELAY);

        cleanup = () => clearTimeout(timer);
      } catch (error) {

        setIsCheckingToken(false);
      }
    };

    checkAndShowPrompt();

    return () => {
      cleanup?.();
    };
  }, [participantId, participantStatus]);

  const handleRequestPermission = async () => {
    // Capture participantId in closure to prevent race condition
    const capturedParticipantId = participantId;

    if (!capturedParticipantId) {

      toast({
        variant: 'destructive',
        title: '사용자 정보를 불러오는 중입니다',
        description: '잠시 후 다시 시도해주세요.',
      });
      return;
    }

    try {
      setIsInitializing(true);

      // 1. 브라우저 알림 권한 요청
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {

        // 2. FCM 지원 여부 확인 후 messaging 인스턴스 생성
        const { isFCMSupported } = await import('@/lib/firebase/webpush');
        const fcmSupported = await isFCMSupported();
        const messaging = fcmSupported ? getMessaging(getFirebaseApp()) : null;

        // 3. Push notifications 초기화 (FCM + Web Push)
        const initResult = await initializePushNotifications(messaging, capturedParticipantId);

        if (initResult) {
          setCleanup(() => initResult.cleanup);

          // 3. 환영 알림 표시 (localStorage 사용 안 함)
          try {
            // Service Worker를 통한 알림 표시
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('필립앤소피', {
              body: '알림이 활성화되었습니다 🎉',
              icon: '/image/app-icon.webp',
              badge: '/image/badge-icon.webp',
              tag: 'welcome-notification',
              requireInteraction: false,
            });

          } catch (notificationError) {
            // 알림 표시 실패해도 전체 흐름은 계속 진행

          }
        } else {

          toast({
            variant: 'destructive',
            title: '알림 설정 실패',
            description: '알림 토큰을 가져올 수 없습니다. 다시 시도해주세요.',
          });
        }
      } else if (result === 'denied') {

        // 브라우저 설정에서 차단됨 - 프롬프트만 닫기 (localStorage 사용 안 함)
      }
    } catch (error) {

      toast({
        variant: 'destructive',
        title: '알림 설정 오류',
        description: '알림 설정 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // localStorage 사용 안 함 - Firestore 기준으로만 판단
    // 다음번 진입 시 토큰 없으면 프롬프트 다시 표시 (사용자가 설정에서 제어 가능)
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [cleanup]);

  // 프롬프트를 표시하지 않는 경우
  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-9999 animate-in slide-in-from-bottom-5 md:left-auto md:right-4 md:w-96 pointer-events-auto">
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

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isInitializing || !participantId || isCheckingToken}
                className="flex-1 rounded-lg bg-black px-6 py-3.5 text-base font-bold text-white transition-colors active:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px]"
              >
                {isCheckingToken ? '확인 중...' : isInitializing ? '설정 중...' : '허용'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isInitializing || isCheckingToken}
                className="rounded-lg border border-gray-300 px-6 py-3.5 text-base font-medium text-gray-700 transition-colors active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px]"
              >
                나중에
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={isInitializing || isCheckingToken}
            className="shrink-0 rounded-lg p-3 text-gray-400 transition-colors active:bg-gray-200 disabled:opacity-50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
