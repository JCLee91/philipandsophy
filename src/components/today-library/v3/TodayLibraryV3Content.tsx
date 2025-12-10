'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import UnifiedButton from '@/components/UnifiedButton';
import PostProgramView from '@/components/today-library/PostProgramView';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';
import EmptyStateFirstAuth from '@/components/today-library/common/EmptyStateFirstAuth';
import EmptyStateNoMatching from '@/components/today-library/common/EmptyStateNoMatching';
import TodayLibraryTabs from './TodayLibraryTabs';
import { useTodayLibraryV3 } from '@/hooks/today-library/use-today-library-v3';
import { appRoutes } from '@/lib/navigation';

export default function TodayLibraryV3Content() {
  const {
    cohortId,
    cohort,
    currentUserId,
    isLoading,
    isValidSession,
    isFirstTimeUser,
    isMatchingInProgress,
    showPostProgramView,
    fromRecap,
    isViewingOtherCluster,
    clusterMatching,
    clusterMembersWithSubmissions,
    dailyQuestion,
    expandedAnswers,
    toggleAnswer,
    handleProfileClick,
    handleReviewClick,
    handleBack,
    handleReturnToMyCluster,
    getTopBarTitle,
    getMeetingDateBadge,
    router,
    allParticipants,
  } = useTodayLibraryV3();

  // 로딩 상태
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // 세션 검증 실패
  if (!isValidSession) {
    return null;
  }

  // 프로그램 종료 후: PostProgramView
  if (showPostProgramView && cohort) {
    return (
      <PostProgramView
        cohort={cohort}
        cohortId={cohortId!}
        currentUserId={currentUserId || ''}
      />
    );
  }

  // 첫 인증 완료 상태
  if (isFirstTimeUser) {
    return (
      <EmptyStateFirstAuth
        cohortId={cohortId!}
        currentUserId={currentUserId || ''}
        variant="v3"
      />
    );
  }

  // 매칭 진행 중
  if (isMatchingInProgress) {
    return (
      <EmptyStateNoMatching
        cohortId={cohortId!}
        currentUserId={currentUserId || ''}
        type="matching_in_progress"
      />
    );
  }

  // 클러스터 매칭 없음
  if (!clusterMatching) {
    return (
      <EmptyStateNoMatching
        cohortId={cohortId!}
        currentUserId={currentUserId || ''}
        type="no_matching"
      />
    );
  }

  const { cluster } = clusterMatching;
  const dateBadge = getMeetingDateBadge();

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-[#F6F6F6]">
        <TopBar
          title={getTopBarTitle()}
          onBack={handleBack}
          align="center"
          className="bg-white border-b-0"
        />

        <main
          className="flex-1 overflow-hidden touch-pan-y flex flex-col"
        >
          {/* 네비게이션 버튼 영역 (Only show if viewing other cluster or from recap) */}
          {(isViewingOtherCluster || (!fromRecap && isViewingOtherCluster)) && (
            <div className="flex px-6 pt-5 bg-[#F6F6F6]">
              {isViewingOtherCluster ? (
                <button
                  onClick={handleReturnToMyCluster}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                  내 모임으로 돌아가기
                </button>
              ) : null}
            </div>
          )}

          {/* New Tabbed Interface */}
          <TodayLibraryTabs
            currentUserId={currentUserId || ''}
            cohort={cohort!}
            cluster={cluster}
            dateBadge={dateBadge.label}
            members={clusterMembersWithSubmissions}
            dailyQuestion={dailyQuestion}
            expandedAnswers={expandedAnswers}
            onProfileClick={handleProfileClick}
            onReviewClick={handleReviewClick}
            toggleAnswer={toggleAnswer}
            allParticipants={allParticipants}
          />
        </main>

        {/* Fixed Footer Button - Removed here, as it's now inside specific tabs or redundant */}
        {/* If we want to keep "My Profile Book" accessible always, we can put it here or inside TodayLibraryTabs.
            However, with the new Tab structure, "Likes" tab takes space.
            Let's keep the global footer logic consistent if desired, but for now I removed it from here to let Tabs handle their own layout or footer needs if necessary.
            Actually, the original design had a fixed footer. Let's add it back if it doesn't conflict with tabs.
            The Tabs component has `pb-32` padding at bottom of content areas to accommodate this.
        */}
         <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#F2F2F2] z-50 safe-area-bottom">
          <UnifiedButton
            fullWidth
            onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId!))}
          >
            내 프로필 북 보기
          </UnifiedButton>
        </div>
        <style jsx>{`
          .safe-area-bottom {
            padding-bottom: calc(24px + env(safe-area-inset-bottom));
          }
        `}</style>
      </div>
    </PageTransition>
  );
}
