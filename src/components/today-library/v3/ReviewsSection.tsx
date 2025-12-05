'use client';

import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { ClusterMemberWithSubmission } from '@/types/today-library';

interface ReviewsSectionProps {
  members: ClusterMemberWithSubmission[];
  onProfileClick: (participantId: string) => void;
  onReviewClick: (participantId: string) => void;
}

export default function ReviewsSection({
  members,
  onProfileClick,
  onReviewClick,
}: ReviewsSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-[18px] font-bold text-[#31363E] mb-4 leading-[1.4]">오늘의 감상평</h2>
      <div className="flex flex-col">
        {members.map(member => (
          <div key={member.id} className="flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start">
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
            <div
              className="flex-1 flex flex-col gap-1 cursor-pointer min-w-0"
              onClick={() => onReviewClick(member.id)}
            >
              {member.submission?.bookTitle && (
                <div className="bg-[#F2F4F6] px-2 py-1 rounded-[4px] self-start max-w-full">
                  <h3 className="text-[12px] font-bold text-[#4E5968] truncate">
                    {member.submission.bookTitle}
                  </h3>
                </div>
              )}
              <p className="text-[14px] text-[#333D4B] leading-[1.5] line-clamp-1 break-words">
                {member.review || '작성된 감상평이 없습니다.'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
