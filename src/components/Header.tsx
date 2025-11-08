'use client';

import { Users, PenSquare, Mail, Settings } from 'lucide-react';
import { useTotalUnreadCount } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';

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
    <header className="fixed top-0 left-0 right-0 z-[999] border-b bg-background safe-area-header isolate">
      <div className="container flex h-14 items-center justify-center relative px-6">
        {/* Left side - Settings icon */}
        <div className="absolute left-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onSettingsClick}
            className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
            aria-label="설정"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Center - Title */}
        <h1 className="text-lg font-bold text-foreground">
          {currentCohort?.name || '필립앤소피'}
        </h1>

        {/* Right side - Action icons */}
        <div className="absolute right-6 flex items-center gap-2">
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
        </div>
      </div>
      <style jsx>{`
        .safe-area-header {
          padding-top: env(safe-area-inset-top);
        }

        /* iOS 11.2 이전 버전 호환성 */
        @supports (padding-top: constant(safe-area-inset-top)) {
          .safe-area-header {
            padding-top: constant(safe-area-inset-top);
          }
        }
      `}</style>
    </header>
  );
}
