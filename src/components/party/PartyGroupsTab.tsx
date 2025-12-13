'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { PARTY_ROUNDS, type PartyGroup } from '@/constants/party-guests';
import type { Participant } from '@/types/database';

interface PartyGroupsTabProps {
  participants: Participant[];
  currentUserName: string | null;
  onProfileClick: (participantId: string) => void;
}

const SWIPE_THRESHOLD = 50;

function getNameWithoutSurname(fullName: string) {
  const name = fullName.trim();
  if (!name) return '';

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const firstToken = tokens[0];
    if (/^[가-힣]{1}$/.test(firstToken)) return tokens.slice(1).join(' ');
    return tokens.slice(0, -1).join(' ') || tokens[0];
  }

  if (/^[가-힣]+$/.test(name) && name.length >= 3) return name.slice(1);
  return name;
}

export default function PartyGroupsTab({
  participants,
  currentUserName,
  onProfileClick,
}: PartyGroupsTabProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  const participantsByName = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => {
      map.set(p.name, p);
    });
    return map;
  }, [participants]);

  const currentRound = PARTY_ROUNDS[currentRoundIndex];
  const myGroup = currentUserName
    ? currentRound.groups.find((g) => g.members.includes(currentUserName))
    : null;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && currentRoundIndex < PARTY_ROUNDS.length - 1) {
      setCurrentRoundIndex((prev) => prev + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD && currentRoundIndex > 0) {
      setCurrentRoundIndex((prev) => prev - 1);
    }
  };

  const getDragElastic = () => {
    if (currentRoundIndex === 0) return { left: 0.2, right: 0 };
    if (currentRoundIndex === PARTY_ROUNDS.length - 1) return { left: 0, right: 0.2 };
    return 0.2;
  };

  const hasAnyMembers = currentRound.groups.some((g) => g.members.length > 0);

  return (
    <div className="pb-8">
      {/* 라운드 인디케이터 */}
      <div className="flex justify-center gap-2 py-4">
        {PARTY_ROUNDS.map((round, idx) => (
          <button
            key={round.roundId}
            onClick={() => setCurrentRoundIndex(idx)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              idx === currentRoundIndex ? 'w-6 bg-[#333D4B]' : 'w-2 bg-gray-300'
            )}
          />
        ))}
      </div>

      {/* 라운드 이름 */}
      <div className="text-center mb-4">
        <span className="text-lg font-bold text-[#333D4B]">{currentRound.roundName}</span>
      </div>

      {/* 스와이프 가능한 카드 영역 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRoundIndex}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={getDragElastic()}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="px-6 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          {!hasAnyMembers ? (
            <div className="py-20 text-center text-gray-400 text-sm bg-white rounded-[12px] shadow-sm">
              조 구성이 아직 공개되지 않았습니다.
            </div>
          ) : (
            <>
              {/* 내 조 강조 표시 */}
              {myGroup && myGroup.members.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-[#8B95A1] mb-2 px-1">내가 속한 조</p>
                  <GroupCard
                    group={myGroup}
                    isMyGroup={true}
                    participantsByName={participantsByName}
                    onProfileClick={onProfileClick}
                  />
                </div>
              )}

              {/* 전체 조 목록 */}
              <div className="space-y-3">
                <p className="text-sm text-[#8B95A1] px-1">전체 조 편성</p>
                {currentRound.groups
                  .filter((g) => g.members.length > 0)
                  .map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isMyGroup={myGroup?.id === group.id}
                      participantsByName={participantsByName}
                      onProfileClick={onProfileClick}
                    />
                  ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 스와이프 힌트 */}
      <div className="text-center text-xs text-gray-400 mt-4">
        좌우로 스와이프하여 다른 조 보기
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: PartyGroup;
  isMyGroup: boolean;
  participantsByName: Map<string, Participant>;
  onProfileClick: (participantId: string) => void;
}

function GroupCard({ group, isMyGroup, participantsByName, onProfileClick }: GroupCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-[12px] p-4 shadow-sm',
        isMyGroup && 'ring-2 ring-[#FFB020] bg-[#FFF7E8]'
      )}
    >
      {/* 조 이름 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-bold text-[#333D4B]">
          {group.id.endsWith('기') ? group.id : `${group.id}조`}
        </span>
        <span className="text-sm text-[#8B95A1]">{group.members.length}명</span>
        {isMyGroup && (
          <span className="ml-auto rounded-full bg-[#FFB020] px-2 py-0.5 text-[11px] font-bold text-white">
            내 조
          </span>
        )}
      </div>

      {/* 조원 목록 */}
      <div className="flex flex-wrap gap-2">
        {group.members.map((memberName) => {
          const participant = participantsByName.get(memberName);
          const displayName = getNameWithoutSurname(memberName);

          return (
            <button
              key={memberName}
              onClick={() => participant && onProfileClick(participant.id)}
              disabled={!participant}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full transition-colors',
                participant
                  ? 'bg-[#F9FAFB] hover:bg-gray-100 active:bg-gray-200'
                  : 'bg-gray-100 opacity-50 cursor-not-allowed'
              )}
            >
              {/* 프로필 이미지 */}
              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                {participant?.profileImageCircle || participant?.profileImage ? (
                  <Image
                    src={
                      getResizedImageUrl(
                        participant.profileImageCircle || participant.profileImage
                      ) || '/image/default-profile.svg'
                    }
                    alt={memberName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    {displayName[0]}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-[#333D4B]">{displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
