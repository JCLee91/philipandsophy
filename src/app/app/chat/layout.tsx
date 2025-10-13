'use client';

import { NotificationPrompt } from '@/components/notifications/notification-prompt';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useEffect, useState } from 'react';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [participantId, setParticipantId] = useState<string | undefined>(undefined);

  // 로컬 스토리지에서 참가자 ID 가져오기
  useEffect(() => {
    const storedParticipantId = localStorage.getItem('participantId');
    if (storedParticipantId) {
      setParticipantId(storedParticipantId);
    }
  }, []);

  // 푸시 알림 초기화
  const { isSupported, permission } = usePushNotifications(participantId, true);

  return (
    <>
      {children}
      {/* 알림 권한 요청 프롬프트 */}
      <NotificationPrompt />
    </>
  );
}
