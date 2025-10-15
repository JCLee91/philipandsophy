'use client';

import { NotificationPrompt } from '@/components/notifications/notification-prompt';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/hooks/use-auth';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const participantId = currentUser?.id;

  // 세션 로딩이 끝난 뒤에만 초기화 시도
  usePushNotifications(participantId, !isLoading);

  return (
    <>
      {children}
      {/* 알림 권한 요청 프롬프트 */}
      <NotificationPrompt />
    </>
  );
}
