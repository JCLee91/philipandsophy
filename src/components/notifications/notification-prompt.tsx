'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

/**
 * 알림 권한 요청 프롬프트 컴포넌트
 * 사용자에게 브라우저 알림 권한을 요청합니다.
 */
export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // 브라우저가 알림을 지원하는지 확인
    if (!('Notification' in window)) {
      return;
    }

    // 현재 알림 권한 상태 확인
    setPermission(Notification.permission);

    // 권한이 아직 결정되지 않았고, 사용자가 이전에 거부하지 않았다면 프롬프트 표시
    const hasDeclinedBefore = localStorage.getItem('notification-declined');
    if (Notification.permission === 'default' && !hasDeclinedBefore) {
      // 페이지 로드 후 3초 뒤에 프롬프트 표시
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {
        // 테스트 알림 전송
        new Notification('필립앤소피', {
          body: '알림이 활성화되었습니다! 🎉',
          icon: '/favicon.webp',
        });
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
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
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">알림 받기</h3>
            <p className="mt-1 text-sm text-gray-600">
              ⚠️ 중요 | 새로운 메시지, 공지사항, 프로필북 도착 소식 등을 실시간으로 받아보실 수 있습니다. 꼭 허용해주세요.
            </p>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRequestPermission}
                className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-800"
              >
                알림 받기
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                나중에
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
