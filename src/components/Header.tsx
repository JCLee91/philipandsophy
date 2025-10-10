'use client';

import { Users, PenSquare, Mail, LogOut } from 'lucide-react';
import { useTotalUnreadCount } from '@/hooks/use-messages';
import { useSession } from '@/hooks/use-session';

interface HeaderProps {
  onParticipantsClick?: () => void;
  onWriteClick?: () => void;
  onMessageAdminClick?: () => void;
  isAdmin?: boolean;
  currentUserId?: string;
}

export default function Header({
  onParticipantsClick,
  onWriteClick,
  onMessageAdminClick,
  isAdmin,
  currentUserId
}: HeaderProps) {
  const { data: unreadCount = 0 } = useTotalUnreadCount(currentUserId || '');
  const { logout } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-center relative px-4">
        <h1 className="text-lg font-bold text-foreground">
          필립앤소피
        </h1>
        <div className="absolute right-4 flex items-center gap-2">
          {isAdmin ? (
            <button
              type="button"
              onClick={onWriteClick}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
              aria-label="공지 작성"
            >
              <PenSquare className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onMessageAdminClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
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
            className="relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
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
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
            aria-label="로그아웃"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
