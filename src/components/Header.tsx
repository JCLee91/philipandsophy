'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, PenSquare, Mail, Settings, ChevronDown } from 'lucide-react';
import { useTotalUnreadCount } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onParticipantsClick?: () => void;
  onWriteClick?: () => void;
  onMessageAdminClick?: () => void;
  onSettingsClick?: () => void;
  isAdmin?: boolean;
  currentCohort?: { id: string; name: string } | null;
  userCohorts?: Array<{ cohortId: string; cohortName: string }>;
}

export default function Header({
  onParticipantsClick,
  onWriteClick,
  onMessageAdminClick,
  onSettingsClick,
  isAdmin,
  currentCohort,
  userCohorts = [],
}: HeaderProps) {
  const { participant } = useAuth();
  const { data: unreadCount = 0 } = useTotalUnreadCount(participant?.id || '');
  const router = useRouter();
  const [cohortMenuOpen, setCohortMenuOpen] = useState(false);

  const hasMultipleCohorts = userCohorts.length > 1;

  const handleCohortChange = (cohortId: string) => {
    router.push(`/app/chat?cohort=${cohortId}`);
    setCohortMenuOpen(false);
  };

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

        {/* Center - Title / Cohort Selector */}
        {hasMultipleCohorts ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCohortMenuOpen(!cohortMenuOpen)}
              className="flex items-center gap-1 text-lg font-bold text-foreground hover:bg-muted px-3 py-1 rounded-md transition-colors"
            >
              {currentCohort?.name || '필립앤소피'}
              <ChevronDown className="h-4 w-4" />
            </button>
            {cohortMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setCohortMenuOpen(false)}
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[150px]">
                  {userCohorts.map((c) => (
                    <button
                      key={c.cohortId}
                      type="button"
                      onClick={() => handleCohortChange(c.cohortId)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        c.cohortId === currentCohort?.id ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      {c.cohortName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <h1 className="text-lg font-bold text-foreground">
            {currentCohort?.name || '필립앤소피'}
          </h1>
        )}

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
