'use client';

import BookmarkCard from '@/components/BookmarkCard';
import BlurDivider from '@/components/BlurDivider';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { FeaturedParticipant } from '@/types/today-library';

interface ProfileBookGridProps {
  mode: 'all' | 'default';
  // 전체 공개 모드용
  visibleMaleInAllMode?: FeaturedParticipant[];
  visibleFemaleInAllMode?: FeaturedParticipant[];
  maleParticipants?: FeaturedParticipant[];
  femaleParticipants?: FeaturedParticipant[];
  // 기본 모드용
  visibleMale?: FeaturedParticipant[];
  visibleFemale?: FeaturedParticipant[];
  assignedProfileIds?: string[];
  // 공통
  isLocked: boolean;
  isSuperAdmin: boolean;
  shouldShowLockedCards: boolean;
  maleLockedSlots: number;
  femaleLockedSlots: number;
  unlockedCount: number;
  isFinalDay: boolean;
  onProfileClick: (participantId: string, theme: 'similar' | 'opposite', cardIndex?: number) => void;
  onLockedCardClick: (isFinalDayMode: boolean) => void;
}

export default function ProfileBookGrid({
  mode,
  visibleMaleInAllMode = [],
  visibleFemaleInAllMode = [],
  maleParticipants = [],
  femaleParticipants = [],
  visibleMale = [],
  visibleFemale = [],
  assignedProfileIds = [],
  isLocked,
  isSuperAdmin,
  shouldShowLockedCards,
  maleLockedSlots,
  femaleLockedSlots,
  unlockedCount,
  isFinalDay,
  onProfileClick,
  onLockedCardClick,
}: ProfileBookGridProps) {
  if (mode === 'all') {
    return (
      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 남자 */}
        <div className="flex flex-col gap-4">
          {visibleMaleInAllMode.map((p, index) => (
            <div key={p.id} className="flex flex-col">
              <div className="flex justify-center">
                <BookmarkCard
                  profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                  name={p.name}
                  theme="blue"
                  isLocked={false}
                  onClick={() => onProfileClick(p.id, p.theme)}
                />
              </div>
              {(index < visibleMaleInAllMode.length - 1 || (isLocked && !isSuperAdmin && maleParticipants.length > visibleMaleInAllMode.length)) && <BlurDivider />}
            </div>
          ))}

          {/* 자물쇠 카드 (남자) - 전체 공개 모드 */}
          {isLocked && !isSuperAdmin && maleParticipants.length > visibleMaleInAllMode.length && (
            Array.from({ length: maleParticipants.length - visibleMaleInAllMode.length }).map((_, idx) => (
              <div key={`locked-male-all-${idx}`} className="flex flex-col">
                <div className="flex justify-center">
                  <BookmarkCard
                    profileImage=""
                    name=""
                    theme="blue"
                    isLocked={true}
                    onClick={() => onLockedCardClick(isFinalDay)}
                  />
                </div>
                {idx < (maleParticipants.length - visibleMaleInAllMode.length - 1) && <BlurDivider />}
              </div>
            ))
          )}
        </div>

        {/* 오른쪽: 여자 */}
        <div className="flex flex-col gap-4">
          {visibleFemaleInAllMode.map((p, index) => (
            <div key={p.id} className="flex flex-col">
              <div className="flex justify-center">
                <BookmarkCard
                  profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                  name={p.name}
                  theme="yellow"
                  isLocked={false}
                  onClick={() => onProfileClick(p.id, p.theme)}
                />
              </div>
              {(index < visibleFemaleInAllMode.length - 1 || (isLocked && !isSuperAdmin && femaleParticipants.length > visibleFemaleInAllMode.length)) && <BlurDivider />}
            </div>
          ))}

          {/* 자물쇠 카드 (여자) - 전체 공개 모드 */}
          {isLocked && !isSuperAdmin && femaleParticipants.length > visibleFemaleInAllMode.length && (
            Array.from({ length: femaleParticipants.length - visibleFemaleInAllMode.length }).map((_, idx) => (
              <div key={`locked-female-all-${idx}`} className="flex flex-col">
                <div className="flex justify-center">
                  <BookmarkCard
                    profileImage=""
                    name=""
                    theme="yellow"
                    isLocked={true}
                    onClick={() => onLockedCardClick(isFinalDay)}
                  />
                </div>
                {idx < (femaleParticipants.length - visibleFemaleInAllMode.length - 1) && <BlurDivider />}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // mode === 'default'
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 왼쪽: 남자 */}
      <div className="flex flex-col gap-4">
        {visibleMale.map((p) => {
          const cardIndex = assignedProfileIds.indexOf(p.id);
          return (
            <div key={p.id} className="flex flex-col">
              <div className="flex justify-center">
                <BookmarkCard
                  profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                  name={p.name}
                  theme="blue"
                  isLocked={false}
                  onClick={() => onProfileClick(p.id, 'similar', cardIndex)}
                />
              </div>
              <BlurDivider />
            </div>
          );
        })}

        {/* 자물쇠 카드 (남자) */}
        {shouldShowLockedCards && Array.from({ length: maleLockedSlots }).map((_, idx) => {
          const cardIndex = unlockedCount + idx;
          return (
            <div key={`locked-male-${idx}`} className="flex flex-col">
              <div className="flex justify-center">
                <BookmarkCard
                  profileImage=""
                  name=""
                  theme="blue"
                  isLocked={true}
                  onClick={() => onProfileClick('', 'similar', cardIndex)}
                />
              </div>
              <BlurDivider />
            </div>
          );
        })}
      </div>

      {/* 오른쪽: 여자 */}
      <div className="flex flex-col gap-4">
        {visibleFemale.map((p) => {
          const cardIndex = assignedProfileIds.indexOf(p.id);
          return (
            <div key={p.id} className="flex flex-col">
              <div className="flex justify-center">
                <BookmarkCard
                  profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                  name={p.name}
                  theme="yellow"
                  isLocked={false}
                  onClick={() => onProfileClick(p.id, 'opposite', cardIndex)}
                />
              </div>
              <BlurDivider />
            </div>
          );
        })}

        {/* 자물쇠 카드 (여자) */}
        {shouldShowLockedCards && Array.from({ length: femaleLockedSlots }).map((_, idx) => {
          const cardIndex = unlockedCount + maleLockedSlots + idx;
          return (
            <div key={`locked-female-${idx}`} className="flex flex-col">
              <div className="flex justify-center">
                <BookmarkCard
                  profileImage=""
                  name=""
                  theme="yellow"
                  isLocked={true}
                  onClick={() => onProfileClick('', 'opposite', cardIndex)}
                />
              </div>
              <BlurDivider />
            </div>
          );
        })}
      </div>
    </div>
  );
}
