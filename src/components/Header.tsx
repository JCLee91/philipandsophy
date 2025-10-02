'use client';

import { Users, PenSquare, Mail } from 'lucide-react';

interface HeaderProps {
  onParticipantsClick?: () => void;
  onWriteClick?: () => void;
  onMessageAdminClick?: () => void;
  isAdmin?: boolean;
}

export default function Header({
  onParticipantsClick,
  onWriteClick,
  onMessageAdminClick,
  isAdmin
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-center relative px-4">
        <h1 className="text-lg font-bold text-foreground">
          필립앤소피
        </h1>
        <div className="absolute right-4 flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={onWriteClick}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors"
              aria-label="공지 작성"
            >
              <PenSquare className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onMessageAdminClick}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors"
              aria-label="운영자에게 메시지"
            >
              <Mail className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onParticipantsClick}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors"
            aria-label="참가자 목록"
          >
            <Users className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
