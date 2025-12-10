'use client';

import { useMemo } from 'react';
import BookmarkCard from '@/components/BookmarkCard';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { ClusterMemberWithSubmission } from '@/types/today-library';
import type { Cohort, DailyMatchingEntry } from '@/types/database';

interface ProfileBooksTabProps {
  members: ClusterMemberWithSubmission[];
  currentUserId: string;
  cohort: Cohort;
  onProfileClick: (participantId: string) => void;
}

export default function ProfileBooksTab({
  members,
  currentUserId,
  cohort,
  onProfileClick,
}: ProfileBooksTabProps) {
  // 멤버별 누적 매칭 횟수 계산 (useActivityRecap 로직 단순화 적용)
  const matchCounts = useMemo(() => {
    if (!cohort || !cohort.dailyFeaturedParticipants) return {};

    const counts: Record<string, number> = {};
    const sortedDates = Object.keys(cohort.dailyFeaturedParticipants).sort();

    sortedDates.forEach((date) => {
      const dayData = cohort.dailyFeaturedParticipants![date] as DailyMatchingEntry;
      
      // V3 클러스터 매칭만 처리
      if (dayData.matchingVersion !== 'cluster' || !dayData.clusters) return;

      const myAssignment = dayData.assignments?.[currentUserId];
      const myClusterId = myAssignment?.clusterId;

      if (!myClusterId) return;

      // 같은 날 같은 클러스터였던 멤버들 카운트
      Object.entries(dayData.assignments || {}).forEach(([otherId, otherAssignment]) => {
        if (otherId === currentUserId) return;
        if (otherAssignment?.clusterId === myClusterId) {
          counts[otherId] = (counts[otherId] || 0) + 1;
        }
      });
    });

    return counts;
  }, [cohort, currentUserId]);

  // 성별로 분류
  const { males, females } = useMemo(() => {
    const m: ClusterMemberWithSubmission[] = [];
    const f: ClusterMemberWithSubmission[] = [];
    
    // 현재 로그인한 사용자 제외
    const others = members.filter(m => m.id !== currentUserId);

    others.forEach(member => {
      if (member.gender === 'male') m.push(member);
      else f.push(member);
    });

    return { males: m, females: f };
  }, [members, currentUserId]);

  return (
    <div className="flex flex-col gap-6 pt-4 pb-32">
       {/* 안내 문구 */}
       <div className="text-center mb-2">
          <p className="text-[14px] text-[#6B7684]">
            오늘 함께하는 멤버들의 프로필북이에요.<br/>
            누적 매칭 횟수로 친밀도를 확인해보세요!
          </p>
        </div>

      <div className="grid grid-cols-2 gap-6 px-4">
        {/* 남자 멤버 */}
        <div className="flex flex-col gap-6">
          {males.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-2">
              <BookmarkCard
                profileImage={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage || '/image/default-profile.svg'}
                name={member.name}
                theme="blue"
                isLocked={false}
                onClick={() => onProfileClick(member.id)}
              />
              {/* 매칭 횟수 뱃지 */}
              <div className="bg-[#F2F4F6] px-2 py-1 rounded-[6px] text-[11px] font-medium text-[#4E5968]">
                {matchCounts[member.id] ? `${matchCounts[member.id]}번째 만남` : '첫 만남'}
              </div>
            </div>
          ))}
          {males.length === 0 && (
            <div className="col-span-1 flex flex-col items-center justify-center py-10 text-gray-400 text-xs">
              남자 멤버 없음
            </div>
          )}
        </div>

        {/* 여자 멤버 */}
        <div className="flex flex-col gap-6">
          {females.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-2">
              <BookmarkCard
                profileImage={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage || '/image/default-profile.svg'}
                name={member.name}
                theme="yellow"
                isLocked={false}
                onClick={() => onProfileClick(member.id)}
              />
              {/* 매칭 횟수 뱃지 */}
              <div className="bg-[#F2F4F6] px-2 py-1 rounded-[6px] text-[11px] font-medium text-[#4E5968]">
                {matchCounts[member.id] ? `${matchCounts[member.id]}번째 만남` : '첫 만남'}
              </div>
            </div>
          ))}
          {females.length === 0 && (
            <div className="col-span-1 flex flex-col items-center justify-center py-10 text-gray-400 text-xs">
              여자 멤버 없음
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
