'use client';

import { Users, PenSquare, Mail, Settings, Inbox } from 'lucide-react';
import { useTotalUnreadCount } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';

interface HeaderProps {
  onParticipantsClick?: () => void;
  onWriteClick?: () => void;
  onInquiryClick?: () => void; // Added
  onMessageAdminClick?: () => void;
  onSettingsClick?: () => void;
  isAdmin?: boolean;
  adminUnreadCount?: number; // Added
  currentCohort?: { id: string; name: string } | null;
}

export default function Header({
  onParticipantsClick,
  onWriteClick,
  onInquiryClick,
  onMessageAdminClick,
  onSettingsClick,
  isAdmin,
  adminUnreadCount = 0,
  currentCohort,
}: HeaderProps) {
  const { participant } = useAuth();
  // Only fetch user unread count if NOT admin (or if we want to show personal DMs for admin too? But requirement focuses on Inquiry Inbox)
  // For users, we use their ID.
  const { data: userUnreadCount = 0 } = useTotalUnreadCount(participant?.id || '');

  // If admin, use the passed adminUnreadCount. If user, use userUnreadCount.
  // Actually, an admin might also be a participant in other contexts, but here we focus on "Inquiry Inbox" for admins.
  // The 'Mail' button for users shows 'userUnreadCount'.
  // The 'Inbox' button for admins shows 'adminUnreadCount'.

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
              onClick={onInquiryClick}
              className="relative flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
              aria-label="문의함"
            >
              <Inbox className="h-5 w-5" />
              {adminUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onMessageAdminClick}
              className="relative flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
              aria-label="운영자에게 메시지"
            >
              <Mail className="h-5 w-5" />
              {userUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {userUnreadCount > 9 ? '9+' : userUnreadCount}
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
          </button>
        </>
      }
    />
  );
}
