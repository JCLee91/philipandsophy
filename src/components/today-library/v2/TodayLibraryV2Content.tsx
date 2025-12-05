'use client';

import { ChevronRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import FooterActions from '@/components/FooterActions';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';
import EmptyStateFirstAuth from '@/components/today-library/common/EmptyStateFirstAuth';
import ProfileBookGrid from './ProfileBookGrid';
import { useTodayLibraryV2 } from '@/hooks/today-library/use-today-library-v2';
import { appRoutes } from '@/lib/navigation';

export default function TodayLibraryV2Content() {
  const {
    cohortId,
    currentUserId,
    isLoading,
    isValidSession,
    isSuperAdmin,
    isLocked,
    isFinalDay,
    showAllProfiles,
    showAllProfilesWithoutAuth,
    isProfileUnlockMode,
    isRandomMatching,
    matchingVersion,
    allFeaturedIds,
    maleParticipants,
    femaleParticipants,
    visibleMale,
    visibleFemale,
    visibleMaleInAllMode,
    visibleFemaleInAllMode,
    assignedProfileIds,
    totalCount,
    unlockedCount,
    shouldShowLockedCards,
    maleLockedSlots,
    femaleLockedSlots,
    handleProfileClick,
    handleLockedCardClick,
    router,
  } = useTodayLibraryV2();

  // 로딩 상태
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // 세션 검증 실패
  if (!isValidSession) {
    return null;
  }

  // 첫 인증 완료 상태 (매칭 데이터 없음)
  if (allFeaturedIds.length === 0 && !showAllProfiles) {
    return (
      <EmptyStateFirstAuth
        cohortId={cohortId!}
        currentUserId={currentUserId || ''}
        variant="v2"
      />
    );
  }

  // 헤더 타이틀 및 설명
  const getHeaderContent = () => {
    if (isFinalDay || showAllProfilesWithoutAuth) {
      return {
        title: <>오늘의 서재가<br />전면 개방됐어요</>,
        description: '2주간의 여정을 마무리하며 모든 멤버의 프로필 북을 공개합니다',
      };
    }
    if (isRandomMatching && isLocked) {
      return {
        title: <>프로필 북을<br />조금 열어봤어요</>,
        description: `오늘 인증하면 ${totalCount}개의 프로필북을 모두 열어볼 수 있어요`,
      };
    }
    if (isProfileUnlockMode && showAllProfiles) {
      return {
        title: <>프로필 북을<br />확인해보세요</>,
        description: '어제 인증한 모든 멤버의 프로필을 확인할 수 있어요',
      };
    }
    return {
      title: <>프로필 북을<br />확인해보세요</>,
      description: '새벽 2시까지만 읽을 수 있어요',
    };
  };

  const { title, description } = getHeaderContent();

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full pt-3 md:pt-2 pb-6">
            {/* 다른 모임 구경하기 버튼 (v3.0 클러스터 매칭인 경우) */}
            {matchingVersion === 'cluster' && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => router.push(appRoutes.todayLibraryOtherClusters(cohortId!))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  다른 모임 구경하기 <ChevronRight className="size-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {/* Header Section */}
              <div className="flex flex-col gap-3">
                <h1 className="font-bold text-heading-xl text-black">{title}</h1>
                <p className="font-medium text-body-base text-text-secondary">{description}</p>
              </div>

              {/* 프로필북 개수 표시 (v2.0 랜덤 매칭) */}
              {isRandomMatching && !showAllProfiles && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-black">{totalCount}개의 프로필북</span>
                  <span>•</span>
                  <span>{unlockedCount}개 열람 가능</span>
                </div>
              )}

              {/* 프로필 카드 그리드 */}
              <ProfileBookGrid
                mode={showAllProfiles ? 'all' : 'default'}
                visibleMaleInAllMode={visibleMaleInAllMode}
                visibleFemaleInAllMode={visibleFemaleInAllMode}
                maleParticipants={maleParticipants}
                femaleParticipants={femaleParticipants}
                visibleMale={visibleMale}
                visibleFemale={visibleFemale}
                assignedProfileIds={assignedProfileIds}
                isLocked={isLocked}
                isSuperAdmin={isSuperAdmin}
                shouldShowLockedCards={shouldShowLockedCards}
                maleLockedSlots={maleLockedSlots}
                femaleLockedSlots={femaleLockedSlots}
                unlockedCount={unlockedCount}
                isFinalDay={isFinalDay}
                onProfileClick={handleProfileClick}
                onLockedCardClick={handleLockedCardClick}
              />
            </div>
          </div>
        </main>

        <FooterActions>
          {isLocked && !isSuperAdmin ? (
            <div className="grid grid-cols-2 gap-2">
              <UnifiedButton
                variant="secondary"
                onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId!))}
                className="flex-1"
              >
                내 프로필 북 보기
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={() => router.push(appRoutes.submitStep1(cohortId!))}
                className="flex-1"
              >
                독서 인증하기
              </UnifiedButton>
            </div>
          ) : (
            <UnifiedButton
              variant="primary"
              onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId!))}
              className="w-full"
            >
              내 프로필 북 보기
            </UnifiedButton>
          )}
        </FooterActions>
      </div>
    </PageTransition>
  );
}
