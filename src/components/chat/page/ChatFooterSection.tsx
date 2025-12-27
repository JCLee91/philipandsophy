'use client';

import UnifiedButton from '@/components/UnifiedButton';
import FooterActions from '@/components/FooterActions';
import { LayoutDashboard } from 'lucide-react';

type ChatFooterSectionProps = {
  isAdmin: boolean;
  isDay1: boolean;
  isAfterDay14: boolean;
  hasSubmittedToday: boolean;
  cohortName?: string; // 기수 이름 (예: "2기")
  participantName?: string; // 참가자 이름
  onRequestSubmission: () => void;
  onNavigateDashboard: () => void;
  onNavigateTodayLibrary: () => void;
};

export function ChatFooterSection({
  isAdmin,
  isDay1,
  isAfterDay14,
  hasSubmittedToday,
  cohortName,
  participantName,
  onRequestSubmission,
  onNavigateDashboard,
  onNavigateTodayLibrary,
}: ChatFooterSectionProps) {
  return (
    <FooterActions>
      {isAdmin ? (
        <UnifiedButton
          variant="primary"
          onClick={onNavigateDashboard}
          icon={<LayoutDashboard className="h-5 w-5" />}
          className="w-full"
        >
          관리자 대시보드
        </UnifiedButton>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {isDay1 ? (
            <div className="col-span-2 rounded-lg border bg-card p-4 text-center shadow-xs">
              <p className="text-lg font-bold text-foreground mb-1">환영합니다</p>
              <p className="text-sm text-muted-foreground">독서 인증은 내일부터 시작됩니다</p>
            </div>
          ) : (
            <>
              {isAfterDay14 ? (
                <UnifiedButton
                  variant="primary"
                  onClick={onNavigateTodayLibrary}
                  className="whitespace-normal h-auto leading-tight col-span-2"
                >
                  <span className="flex flex-col items-center">
                    {cohortName && <span>{cohortName}</span>}
                    <span>독서모임 히스토리</span>
                  </span>
                </UnifiedButton>
              ) : (
                <>
                  {hasSubmittedToday ? (
                    <UnifiedButton
                      onClick={onRequestSubmission}
                      className="bg-[#E8E9ED] text-[#575E68] hover:bg-[#D8D9DD] font-bold whitespace-normal h-auto leading-tight"
                    >
                      인증 수정하기
                    </UnifiedButton>
                  ) : (
                    <UnifiedButton
                      variant="primary"
                      onClick={onRequestSubmission}
                      className="whitespace-normal h-auto leading-tight"
                    >
                      독서 인증하기
                    </UnifiedButton>
                  )}

                  <UnifiedButton
                    variant="secondary"
                    onClick={onNavigateTodayLibrary}
                    className="whitespace-normal h-auto leading-tight"
                  >
                    오늘의 서재
                  </UnifiedButton>
                </>
              )}
            </>
          )}
        </div>
      )}
    </FooterActions>
  );
}

export default ChatFooterSection;
