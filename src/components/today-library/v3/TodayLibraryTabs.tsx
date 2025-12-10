'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Heart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClusterThemeSection from './ClusterThemeSection';
import ReviewsSection from './ReviewsSection';
import ValuesSection from './ValuesSection';
import ProfileBooksTab from './ProfileBooksTab';
import LikesTab from './LikesTab';
import type { ClusterMemberWithSubmission, Cluster } from '@/types/today-library';
import type { Cohort } from '@/types/database';
import { Participant } from '@/types/database';

interface TodayLibraryTabsProps {
  // Common
  currentUserId: string;
  cohort: Cohort;
  
  // Tab 1: Today
  cluster: Cluster;
  dateBadge: string;
  members: ClusterMemberWithSubmission[];
  dailyQuestion: string;
  expandedAnswers: Set<string>;
  onProfileClick: (participantId: string) => void;
  onReviewClick: (participantId: string) => void;
  toggleAnswer: (participantId: string) => void;

  // Tab 3: Likes (Needs all participants for lookup)
  allParticipants: Participant[];
}

type TabType = 'today' | 'members' | 'likes';

export default function TodayLibraryTabs({
  currentUserId,
  cohort,
  cluster,
  dateBadge,
  members,
  dailyQuestion,
  expandedAnswers,
  onProfileClick,
  onReviewClick,
  toggleAnswer,
  allParticipants,
}: TodayLibraryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('today');

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* 1. Tab Navigation (Sticky Top) */}
      <div className="bg-white sticky top-0 z-20 px-4 pt-2 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab('today')}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
          >
            <span className={cn("text-[15px] font-bold transition-colors", activeTab === 'today' ? "text-[#333D4B]" : "text-[#B0B8C1]")}>
              오늘
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
              멤버
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
              하트
            </span>
            {activeTab === 'likes' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 bg-[#F6F6F6] min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <div className="pb-32">
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
              className="h-full overflow-y-auto bg-white"
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
              className="h-full"
            >
              <LikesTab
                currentUserId={currentUserId}
                allParticipants={allParticipants}
                onProfileClick={onProfileClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
