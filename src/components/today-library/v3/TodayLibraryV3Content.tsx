'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import UnifiedButton from '@/components/UnifiedButton';
import PostProgramView from '@/components/today-library/PostProgramView';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';
import EmptyStateFirstAuth from '@/components/today-library/common/EmptyStateFirstAuth';
import EmptyStateNoMatching from '@/components/today-library/common/EmptyStateNoMatching';
import ClusterThemeSection from './ClusterThemeSection';
import ReviewsSection from './ReviewsSection';
import ValuesSection from './ValuesSection';
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
          className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y"
          style={{ overscrollBehaviorX: 'none' }}
        >
          {/* 네비게이션 버튼 영역 */}
          <div className="flex px-6 pt-5 bg-[#F6F6F6]">
            {isViewingOtherCluster ? (
              <button
                onClick={handleReturnToMyCluster}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="size-4" />
                내 모임으로 돌아가기
              </button>
            ) : !fromRecap ? (
              <button
                onClick={() => router.push(appRoutes.todayLibraryOtherClusters(cohortId!))}
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                다른 모임 구경하기 <ChevronRight className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Theme Section */}
          <ClusterThemeSection
            cluster={cluster}
            members={clusterMembersWithSubmissions}
            dateBadge={dateBadge}
            onMemberClick={handleProfileClick}
          />

          {/* Main Content */}
          <div className="bg-white rounded-t-[24px] px-6 pt-8 pb-32 min-h-[calc(100vh-300px)]">
            <ReviewsSection
              members={clusterMembersWithSubmissions}
              onProfileClick={handleProfileClick}
              onReviewClick={handleReviewClick}
            />

            <ValuesSection
              dailyQuestion={dailyQuestion}
              members={clusterMembersWithSubmissions}
              expandedAnswers={expandedAnswers}
              onProfileClick={handleProfileClick}
              onToggleAnswer={toggleAnswer}
            />
          </div>
        </main>

        {/* Fixed Footer Button */}
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
