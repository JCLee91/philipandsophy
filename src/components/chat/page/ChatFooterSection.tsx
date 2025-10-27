'use client';

import UnifiedButton from '@/components/UnifiedButton';
import FooterActions from '@/components/FooterActions';
import { BookOpen } from 'lucide-react';
import { BookLibraryIcon } from '@/components/icons/BookLibraryIcon';

type ChatFooterSectionProps = {
  isAdmin: boolean;
  isDay1: boolean;
  isAfterDay14: boolean;
  hasSubmittedToday: boolean;
  onRequestSubmission: () => void;
  onNavigateMatching: () => void;
  onNavigateTodayLibrary: () => void;
};

export function ChatFooterSection({
  isAdmin,
  isDay1,
  isAfterDay14,
  hasSubmittedToday,
  onRequestSubmission,
  onNavigateMatching,
  onNavigateTodayLibrary,
}: ChatFooterSectionProps) {
  return (
    <FooterActions>
      {isAdmin ? (
        <UnifiedButton
          variant="primary"
          onClick={onNavigateMatching}
          icon={<BookOpen className="h-5 w-5" />}
          className="w-full"
        >
          매칭 관리
        </UnifiedButton>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {isDay1 ? (
            <div className="col-span-2 rounded-lg border bg-card p-4 text-center shadow-sm">
              <p className="text-lg font-bold text-foreground mb-1">환영합니다</p>
              <p className="text-sm text-muted-foreground">독서 인증은 내일부터 시작됩니다</p>
            </div>
          ) : isAfterDay14 ? (
            <UnifiedButton
              variant="secondary"
              onClick={onNavigateTodayLibrary}
              icon={<BookLibraryIcon className="h-5 w-5" />}
              className="col-span-2"
            >
              10월 멤버의 서재
            </UnifiedButton>
          ) : (
            <>
              <UnifiedButton
                variant="primary"
                onClick={onRequestSubmission}
                icon={<BookOpen className="h-5 w-5" />}
                className={hasSubmittedToday ? 'opacity-50' : ''}
              >
                {hasSubmittedToday ? '인증 수정하기' : '독서 인증'}
              </UnifiedButton>
              <UnifiedButton
                variant="secondary"
                onClick={onNavigateTodayLibrary}
                icon={<BookLibraryIcon className="h-5 w-5" />}
              >
                오늘의 서재
              </UnifiedButton>
            </>
          )}
        </div>
      )}
    </FooterActions>
  );
}

export default ChatFooterSection;
