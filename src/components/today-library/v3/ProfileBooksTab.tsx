'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { ClusterMemberWithSubmission } from '@/types/today-library';
import type { Cohort, DailyMatchingEntry } from '@/types/database';

interface ProfileBooksTabProps {
  members: ClusterMemberWithSubmission[];
  currentUserId: string;
  cohort: Cohort;
  onProfileClick: (participantId: string) => void;
  isOtherCluster?: boolean;
}

export default function ProfileBooksTab({
  members,
  currentUserId,
  cohort,
  onProfileClick,
  isOtherCluster = false,
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

  // 현재 사용자 제외하고 매칭 횟수순 정렬
  const sortedMembers = useMemo(() => {
    return members
      .filter(m => m.id !== currentUserId)
      .sort((a, b) => (matchCounts[b.id] || 0) - (matchCounts[a.id] || 0));
  }, [members, currentUserId, matchCounts]);

  return (
    <div className="px-6 pt-4 pb-32">
      {/* 안내 문구 */}
      <div className="bg-white rounded-[12px] p-4 shadow-xs">
        <p className="text-[13px] font-bold text-[#333D4B] mb-1">
          {isOtherCluster ? '이 모임의 멤버들' : '오늘 함께하는 멤버'}
        </p>
        <p className="text-[12px] text-[#8B95A1]">
          멤버들의 프로필북을 살펴보세요!
        </p>
      </div>

      {/* 멤버 리스트 */}
      <div className="bg-white rounded-[12px] p-4 shadow-xs mt-4">
        <div className="flex flex-col gap-2">
          {sortedMembers.map((member, idx) => (
            <button
              key={member.id}
              onClick={() => onProfileClick(member.id)}
              className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-[10px] hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {/* 순번 */}
              <span className="text-[12px] text-[#8B95A1] w-6 text-center">{idx + 1}</span>

              {/* 프로필 이미지 */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0">
                <Image
                  src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || '/image/default-profile.svg'}
                  alt={member.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* 이름 */}
              <span className="flex-1 text-[14px] font-medium text-[#333D4B] text-left">
                {member.name}
              </span>

              {/* 매칭 횟수 */}
              <span className="text-[12px] text-[#8B95A1]">
                {isOtherCluster
                  ? (matchCounts[member.id] ? `나와 ${matchCounts[member.id]}번 만남` : '아직 만난 적 없음')
                  : (matchCounts[member.id] ? `${matchCounts[member.id]}번째 만남` : '첫 만남')
                }
              </span>
            </button>
          ))}

          {sortedMembers.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">
              {isOtherCluster ? '이 모임의 멤버 정보가 없습니다.' : '오늘 함께하는 멤버가 없습니다.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
