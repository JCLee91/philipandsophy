'use client';

import { Users, PenSquare, Mail, Settings, Inbox } from 'lucide-react';
import { useTotalUnreadCount } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/common/headers';
import { IconButton } from '@/components/common/buttons';

interface HeaderProps {
  onParticipantsClick?: () => void;
  onWriteClick?: () => void;
  onInquiryClick?: () => void;
  onMessageAdminClick?: () => void;
  onSettingsClick?: () => void;
  onBack?: () => void;
  isAdmin?: boolean;
  adminUnreadCount?: number;
  currentCohort?: { id: string; name: string } | null;
}

export default function Header({
  onParticipantsClick,
  onWriteClick,
  onInquiryClick,
  onMessageAdminClick,
  onSettingsClick,
  onBack,
  isAdmin,
  adminUnreadCount = 0,
  currentCohort,
}: HeaderProps) {
  const { participant } = useAuth();
  const { data: userUnreadCount = 0 } = useTotalUnreadCount(participant?.id || '');

  return (
    <TopBar
      position="fixed"
      className="z-999"
      title={`필립앤소피 ${currentCohort?.name || ''}`}
      align="center"
      onBack={onBack}
      leftAction={
        !onBack ? (
          <IconButton
            icon={<Settings className="h-5 w-5" />}
            aria-label="설정"
            onClick={onSettingsClick}
          />
        ) : null
      }
      rightAction={
        <>
          {isAdmin ? (
            <IconButton
              icon={<Inbox className="h-5 w-5" />}
              aria-label="문의함"
              onClick={onInquiryClick}
              badge={adminUnreadCount}
            />
          ) : (
            <IconButton
              icon={<Mail className="h-5 w-5" />}
              aria-label="운영자에게 메시지"
              onClick={onMessageAdminClick}
              badge={userUnreadCount > 9 ? 9 : userUnreadCount}
            />
          )}
          <IconButton
            icon={<Users className="h-5 w-5" />}
            aria-label="참가자 목록"
            onClick={onParticipantsClick}
          />
          {onWriteClick && (
            <IconButton
              icon={<PenSquare className="h-5 w-5" />}
              aria-label="글쓰기"
              onClick={onWriteClick}
            />
          )}
        </>
      }
    />
  );
}
