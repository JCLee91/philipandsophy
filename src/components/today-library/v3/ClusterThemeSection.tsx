'use client';

import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { Cluster } from '@/types/database';
import type { ClusterMemberWithSubmission } from '@/types/today-library';

interface ClusterThemeSectionProps {
  cluster: Cluster;
  members: ClusterMemberWithSubmission[];
  dateBadge: { label: string; isToday: boolean };
  onMemberClick: (participantId: string) => void;
}

export default function ClusterThemeSection({
  cluster,
  members,
  dateBadge,
  onMemberClick,
}: ClusterThemeSectionProps) {
  return (
    <section className="flex flex-col items-center text-center gap-3 pt-2 pb-6 px-6 bg-[#F6F6F6]">
      <div className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm text-[32px]">
        {cluster.emoji || '🥂'}
      </div>

      <div className="flex flex-col gap-2 max-w-full">
        <div className="flex items-center gap-2 justify-center">
          <div className={`text-[12px] font-bold px-3 py-1 rounded-[12px] ${
            dateBadge.isToday ? 'bg-black text-white' : 'bg-gray-400 text-white'
          }`}>
            {dateBadge.label}
          </div>
          <div className="bg-black text-white text-[12px] font-bold px-3 py-1 rounded-[12px]">
            {cluster.category || '감상평'}
          </div>
        </div>
        <h3 className="text-[18px] font-bold text-black">{cluster.theme}</h3>
        <p className="text-[14px] text-[#575E68] whitespace-pre-wrap leading-[1.4] break-words">
          {cluster.reasoning}
        </p>
      </div>

      {/* Member List */}
      <div className="flex flex-wrap items-start justify-center gap-4 mt-2">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col items-center gap-1.5">
            <div
              className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 cursor-pointer"
              onClick={() => onMemberClick(member.id)}
            >
              <Image
                src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage || '/image/default-profile.svg'}
                alt={member.name}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-[11px] text-[#8B95A1]">{member.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
