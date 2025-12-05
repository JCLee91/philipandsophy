'use client';

import UnifiedButton from '@/components/UnifiedButton';
import FooterActions from '@/components/FooterActions';
import { LayoutDashboard, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatFooterSectionProps = {
  isAdmin: boolean;
  isDay1: boolean;
  isAfterDay14: boolean;
  hasSubmittedToday: boolean;
  isSocializingActive?: boolean;
  cohortName?: string; // 기수 이름 (예: "2기")
  useClusterMatching?: boolean; // V3 클러스터 매칭 여부
  onRequestSubmission: () => void;
  onNavigateDashboard: () => void;
  onNavigateTodayLibrary: () => void;
  onOpenSocializing?: () => void;
};

export function ChatFooterSection({
  isAdmin,
  isDay1,
  isAfterDay14,
  hasSubmittedToday,
  isSocializingActive,
  cohortName,
  useClusterMatching,
  onRequestSubmission,
  onNavigateDashboard,
  onNavigateTodayLibrary,
  onOpenSocializing,
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
            <div className="col-span-2 rounded-lg border bg-card p-4 text-center shadow-sm">
              <p className="text-lg font-bold text-foreground mb-1">환영합니다</p>
              <p className="text-sm text-muted-foreground">독서 인증은 내일부터 시작됩니다</p>
            </div>
          ) : (
            <>
              {isSocializingActive && (
                <UnifiedButton
                  variant="primary"
                  onClick={onOpenSocializing}
                  className="whitespace-normal h-auto leading-tight"
                >
                  애프터 다이닝
                </UnifiedButton>
              )}

              {isAfterDay14 ? (
                <UnifiedButton
                  variant={isSocializingActive ? "secondary" : "primary"}
                  onClick={onNavigateTodayLibrary}
                  className={cn(
                    "whitespace-normal h-auto leading-tight",
                    !isSocializingActive && "col-span-2"
                  )}
                >
                  {useClusterMatching ? (
                    // V3: 클러스터 매칭 - 파티 준비 컨셉
                    <span className="flex flex-col items-center">
                      <span>{cohortName || ''}</span>
                      <span>우리의 여정</span>
                    </span>
                  ) : cohortName ? (
                    // V2: 멤버의 서재
                    <span className="flex flex-col items-center">
                      <span>{cohortName}</span>
                      <span>멤버의 서재</span>
                    </span>
                  ) : '멤버 프로필 둘러보기'}
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
                    className={cn(
                      "whitespace-normal h-auto leading-tight",
                      isSocializingActive && "col-span-2"
                    )}
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
