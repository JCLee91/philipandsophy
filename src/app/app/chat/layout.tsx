'use client';

import { NotificationPrompt } from '@/components/notifications/notification-prompt';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ AuthContext에서 participant 직접 가져오기 (localStorage 대신)
  const { participant } = useAuth();

  // 푸시 알림 초기화 (사용자가 명시적으로 활성화한 경우에만)
  const { isSupported, permission } = usePushNotifications(
    participant?.id,
    participant?.pushNotificationEnabled ?? false
  );

  return (
    <>
      {children}
      {/* 알림 권한 요청 프롬프트 */}
      <NotificationPrompt />
    </>
  );
}
