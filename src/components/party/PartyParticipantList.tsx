'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { Participant } from '@/types/database';

function getNameWithoutSurname(fullName: string) {
  const name = fullName.trim();
  if (!name) return '';

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const firstToken = tokens[0];
    // Korean style: "김 민수" (surname token is usually 1 char)
    if (/^[가-힣]{1}$/.test(firstToken)) return tokens.slice(1).join(' ');
    // Otherwise assume Western style: "John Smith" (surname last)
    return tokens.slice(0, -1).join(' ') || tokens[0];
  }

  // Korean style without space: "김민수" -> "민수"
  if (/^[가-힣]+$/.test(name) && name.length >= 3) return name.slice(1);
  return name;
}

interface PartyParticipantListProps {
  participants: Participant[];
  onProfileClick: (participantId: string) => void;
  emptyMessage?: string;
  highlightParticipantId?: string;
}

export default function PartyParticipantList({
  participants,
  onProfileClick,
  emptyMessage = '아직 파티 참가자 명단이 공개되지 않았습니다.',
  highlightParticipantId,
}: PartyParticipantListProps) {

  if (participants.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 text-sm bg-white rounded-[12px] shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  const hasPinnedMe = Boolean(highlightParticipantId && participants[0]?.id === highlightParticipantId);

  return (
    <div className="bg-white rounded-[12px] p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        {participants.map((member, idx) => {
          const displayName = getNameWithoutSurname(member.name);
          const isMe = Boolean(highlightParticipantId && member.id === highlightParticipantId);

          const elements: ReactNode[] = [];

          elements.push(
            <button
              key={member.id}
              onClick={() => onProfileClick(member.id)}
              className={[
                'flex items-center gap-3 p-3 rounded-[10px] transition-colors',
                isMe
                  ? 'bg-[#FFF7E8] hover:bg-[#FFEFCE] active:bg-[#FFE7BA]'
                  : 'bg-[#F9FAFB] hover:bg-gray-100 active:bg-gray-200',
              ].join(' ')}
            >
              {/* 순번 */}
              <span className="text-[12px] text-[#8B95A1] w-6 text-center font-medium">
                {idx + 1}
              </span>

            {/* 프로필 이미지 */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-white">
              <Image
                src={
                  getResizedImageUrl(member.profileImageCircle || member.profileImage) ||
                  member.profileImageCircle ||
                  member.profileImage ||
                  '/image/default-profile.svg'
                }
                alt={member.name}
                fill
                className="object-cover"
              />
            </div>

            {/* 이름 */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#333D4B] text-left truncate">
                  {displayName}
                </span>
                {isMe && (
                  <span className="shrink-0 rounded-full bg-[#FFB020] px-2 py-0.5 text-[11px] font-bold text-white">
                    내 프로필북
                  </span>
                )}
              </div>

            {/* 화살표 아이콘 (클릭 가능함을 암시) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 15L12.5 10L7.5 5"
                stroke="#B0B8C1"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            </button>
          );

          if (idx === 0 && hasPinnedMe) {
            elements.push(
              <div
                key="__me_divider__"
                className="h-px w-full bg-[#E5E8EB] my-1"
              />
            );
          }

          return elements;
        })}
      </div>
    </div>
  );
}
