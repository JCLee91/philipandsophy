'use client';

import { NotificationPrompt } from '@/components/notifications/notification-prompt';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useSession } from '@/hooks/use-session';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { participantId, isLoading } = useSession();

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
