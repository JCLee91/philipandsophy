'use client';

import { Users, PenSquare, Mail, Settings } from 'lucide-react';
import { useTotalUnreadCount } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';

interface HeaderProps {
  onParticipantsClick?: () => void;
  onWriteClick?: () => void;
  onMessageAdminClick?: () => void;
  onSettingsClick?: () => void;
  isAdmin?: boolean;
  currentCohort?: { id: string; name: string } | null;
}

export default function Header({
  onParticipantsClick,
  onWriteClick,
  onMessageAdminClick,
  onSettingsClick,
  isAdmin,
  currentCohort,
}: HeaderProps) {
  const { participant } = useAuth();
  const { data: unreadCount = 0 } = useTotalUnreadCount(participant?.id || '');

  return (
    <TopBar
      position="fixed"
      className="z-[999]"
      title={`필립앤소피 ${currentCohort?.name || ''}`}
      align="center"
      leftAction={
        <button
          type="button"
          onClick={onSettingsClick}
          className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
          aria-label="설정"
        >
          <Settings className="h-5 w-5" />
        </button>
      }
      rightAction={
        <>
          {isAdmin ? (
            <button
              type="button"
              onClick={onWriteClick}
              className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
              aria-label="공지 작성"
            >
              <PenSquare className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onMessageAdminClick}
              className="relative flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
              aria-label="운영자에게 메시지"
            >
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onParticipantsClick}
            className="relative flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
            aria-label="참가자 목록"
          >
            <Users className="h-5 w-5" />
            {/* 운영자에게만 참가자 목록 아이콘에 미확인 DM 배지 표시 */}
            {isAdmin && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </>
      }
    />
  );
}
