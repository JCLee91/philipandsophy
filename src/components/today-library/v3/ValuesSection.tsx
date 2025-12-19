'use client';

import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import AccordionContent from './AccordionContent';
import LikeButton from '@/features/likes/components/LikeButton';
import type { ClusterMemberWithSubmission } from '@/types/today-library';

interface ValuesSectionProps {
  dailyQuestion: string;
  members: ClusterMemberWithSubmission[];
  expandedAnswers: Set<string>;
  onProfileClick: (participantId: string) => void;
  onToggleAnswer: (participantId: string) => void;
  currentUserId: string;
  isLocked: boolean;
  isSuperAdmin: boolean;
}

export default function ValuesSection({
  dailyQuestion,
  members,
  expandedAnswers,
  onProfileClick,
  onToggleAnswer,
  currentUserId,
  isLocked,
  isSuperAdmin,
}: ValuesSectionProps) {
  if (!dailyQuestion) return null;

  return (
    <section className="mb-10">
      <h2 className="text-[18px] font-bold text-[#31363E] mb-4 leading-[1.4]">오늘의 가치관 답변</h2>

      {/* Question Card */}
      <div className="bg-[#F9FAFB] rounded-[16px] p-4 mb-4">
        <div className="bg-black rounded-[12px] px-3 py-1.5 inline-flex items-center justify-center mb-3">
          <span className="text-white text-[12px] font-bold">가치관</span>
        </div>
        <h2 className="text-[15px] font-medium text-[#333D4B] leading-normal">
          {dailyQuestion}
        </h2>
      </div>

      {/* Answer List */}
      <div className="flex flex-col">
        {members.map(member => {
          const isExpanded = expandedAnswers.has(member.id);
          const answerLength = member.dailyAnswer ? member.dailyAnswer.length : 0;

          return (
            <div
              key={member.id}
              className="flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start"
            >
              {/* Left: Avatar & Name */}
              <div className="flex flex-col items-center gap-1 shrink-0 w-[40px]">
                <div
                  className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 cursor-pointer"
                  onClick={() => onProfileClick(member.id)}
                >
                  <Image
                    src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage || '/image/default-profile.svg'}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <span className="text-[11px] text-[#8B95A1] text-center w-full truncate">{member.name}</span>
              </div>

              {/* Right: Content */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                {/* Top Row: Character Count + Like Button */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[12px] text-[#8B95A1] cursor-pointer"
                    onClick={() => onToggleAnswer(member.id)}
                  >
                    [{answerLength}자]
                  </span>
                  {/* Like Button - 우측 상단 (본인 글에는 표시 안 함) */}
                  {member.submission && member.id !== currentUserId && (
                    <LikeButton
                      targetId={`${member.submission.id}_answer`}
                      targetType="answer"
                      targetUserId={member.id}
                      currentUserId={currentUserId}
                      initialCount={member.submission.answerLikeCount || 0}
                      isLocked={isLocked && !isSuperAdmin}
                    />
                  )}
                </div>

                {/* Text + Chevron Row */}
                <div
                  className="cursor-pointer"
                  onClick={() => onToggleAnswer(member.id)}
                >
                  <AccordionContent
                    text={member.dailyAnswer}
                    isExpanded={isExpanded}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
