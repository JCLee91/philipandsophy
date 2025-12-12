'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClusterThemeSection from './ClusterThemeSection';
import ReviewsSection from './ReviewsSection';
import ValuesSection from './ValuesSection';
import ProfileBooksTab from './ProfileBooksTab';
import LikesTab from './LikesTab';
import { appRoutes } from '@/lib/navigation';
import type { ClusterMemberWithSubmission } from '@/types/today-library';
import type { Cohort, Participant, Cluster } from '@/types/database';

interface TodayLibraryTabsProps {
  // Common
  currentUserId: string;
  cohort: Cohort;
  cohortId: string;

  // Tab 1: Today
  cluster: Cluster;
  dateBadge: { label: string; isToday: boolean };
  members: ClusterMemberWithSubmission[];
  dailyQuestion: string;
  expandedAnswers: Set<string>;
  onProfileClick: (participantId: string) => void;
  onReviewClick: (participantId: string) => void;
  toggleAnswer: (participantId: string) => void;

  // Tab 3: Likes (Needs all participants for lookup)
  allParticipants: Participant[];

  // Navigation
  isViewingOtherCluster: boolean;
  fromRecap: boolean;
  onReturnToMyCluster: () => void;
}

type TabType = 'today' | 'members' | 'likes';

export default function TodayLibraryTabs({
  currentUserId,
  cohort,
  cohortId,
  cluster,
  dateBadge,
  members,
  dailyQuestion,
  expandedAnswers,
  onProfileClick,
  onReviewClick,
  toggleAnswer,
  allParticipants,
  isViewingOtherCluster,
  fromRecap,
  onReturnToMyCluster,
}: TodayLibraryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL 쿼리 파라미터로 탭 상태 관리 (뒤로가기 시 유지)
  const tabParam = searchParams.get('tab');
  const activeTab: TabType = (tabParam === 'members' || tabParam === 'likes') ? tabParam : 'today';
  
  // 탭 변경 시 URL 업데이트 (히스토리 교체)
  const setActiveTab = useCallback((tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'today') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    // 좋아요 서브탭 초기화
    if (tab !== 'likes') {
      params.delete('likesTab');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, searchParams]);

  // 다른 모임 구경 중일 때는 모임/프로필북 탭만 표시
  if (isViewingOtherCluster) {
    return (
      <div className="flex flex-col">
        {/* 탭 네비게이션 (모임/프로필북만) */}
        <div className="bg-white sticky top-0 z-20 px-4 pt-2 border-b border-[#F2F4F6]">
          <div className="flex items-center justify-around">
            <button
              onClick={() => setActiveTab('today')}
              className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
            >
              <span className={cn("text-[15px] font-bold transition-colors", activeTab === 'today' ? "text-[#333D4B]" : "text-[#B0B8C1]")}>
                모임
              </span>
              {activeTab === 'today' && (
                <motion.div layoutId="otherClusterTab" className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
            >
              <span className={cn("text-[15px] font-bold transition-colors", activeTab === 'members' ? "text-[#333D4B]" : "text-[#B0B8C1]")}>
                프로필북
              </span>
              {activeTab === 'members' && (
                <motion.div layoutId="otherClusterTab" className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]" />
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-[#F6F6F6]">
          <AnimatePresence mode="wait">
            {activeTab === 'today' && (
              <motion.div
                key="other-today"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="pb-32">
                  {/* 내 모임으로 돌아가기 버튼 */}
                  <div className="flex px-6 pt-4 bg-[#F6F6F6]">
                    <button
                      onClick={onReturnToMyCluster}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                      내 모임으로 돌아가기
                    </button>
                  </div>

                  {/* Theme Section */}
                  <ClusterThemeSection
                    cluster={cluster}
                    members={members}
                    dateBadge={dateBadge}
                    onMemberClick={onProfileClick}
                  />

                  {/* Content Cards */}
                  <div className="bg-white rounded-t-[24px] px-6 pt-8 pb-10 min-h-[500px]">
                    <ReviewsSection
                      members={members}
                      onProfileClick={onProfileClick}
                      onReviewClick={onReviewClick}
                      currentUserId={currentUserId}
                    />

                    <ValuesSection
                      dailyQuestion={dailyQuestion}
                      members={members}
                      expandedAnswers={expandedAnswers}
                      onProfileClick={onProfileClick}
                      onToggleAnswer={toggleAnswer}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'members' && (
              <motion.div
                key="other-members"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileBooksTab
                  members={members}
                  currentUserId={currentUserId}
                  cohort={cohort}
                  onProfileClick={onProfileClick}
                  isOtherCluster
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* 1. Tab Navigation (Sticky Top - sticks to main scroll container) */}
      <div className="bg-white sticky top-0 z-20 px-4 pt-2 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab('today')}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
          >
            <span className={cn("text-[15px] font-bold transition-colors", activeTab === 'today' ? "text-[#333D4B]" : "text-[#B0B8C1]")}>
              모임
            </span>
            {activeTab === 'today' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
          >
            <span className={cn("text-[15px] font-bold transition-colors", activeTab === 'members' ? "text-[#333D4B]" : "text-[#B0B8C1]")}>
              프로필북
            </span>
            {activeTab === 'members' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('likes')}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
          >
            <span className={cn("text-[15px] font-bold transition-colors", activeTab === 'likes' ? "text-[#333D4B]" : "text-[#B0B8C1]")}>
              좋아요
            </span>
            {activeTab === 'likes' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="bg-[#F6F6F6]">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="pb-32">
                {/* 다른 모임 구경하기 버튼 (내 모임일 때만) */}
                {!fromRecap && (
                  <div className="flex justify-end px-6 pt-4 bg-[#F6F6F6]">
                    <button
                      onClick={() => router.push(appRoutes.todayLibraryOtherClusters(cohortId))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      다른 모임 구경하기 <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}

                {/* Theme Section */}
                <ClusterThemeSection
                  cluster={cluster}
                  members={members}
                  dateBadge={dateBadge}
                  onMemberClick={onProfileClick}
                />
                
                {/* Content Cards */}
                <div className="bg-white rounded-t-[24px] px-6 pt-8 pb-10 min-h-[500px]">
                    <ReviewsSection
                        members={members}
                        onProfileClick={onProfileClick}
                        onReviewClick={onReviewClick}
                        currentUserId={currentUserId}
                    />

                    <ValuesSection
                        dailyQuestion={dailyQuestion}
                        members={members}
                        expandedAnswers={expandedAnswers}
                        onProfileClick={onProfileClick}
                        onToggleAnswer={toggleAnswer}
                        currentUserId={currentUserId}
                    />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <ProfileBooksTab
                members={members}
                currentUserId={currentUserId}
                cohort={cohort}
                onProfileClick={onProfileClick}
              />
            </motion.div>
          )}

          {activeTab === 'likes' && (
            <motion.div
              key="likes"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <LikesTab
                currentUserId={currentUserId}
                allParticipants={allParticipants}
                onProfileClick={onProfileClick}
                onReviewClick={onReviewClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
