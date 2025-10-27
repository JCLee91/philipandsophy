'use client';

import Image from 'next/image';
import { BOOKMARK_DIMENSIONS, BOOKMARK_THEMES } from '@/constants/today-library';
import { getFirstName } from '@/lib/utils';

interface BookmarkCardProps {
  profileImage: string;
  name: string;
  theme: 'blue' | 'yellow';
  isLocked: boolean;
  lockedImage?: string; // 미인증 상태에서 보여줄 이미지 (각 카드마다 다름)
  onClick: () => void;
}

export default function BookmarkCard({
  profileImage,
  name,
  theme,
  isLocked,
  lockedImage,
  onClick,
}: BookmarkCardProps) {
  const config = BOOKMARK_THEMES[theme];

  return (
    <div className="relative" style={{ width: `${BOOKMARK_DIMENSIONS.CARD_WIDTH}px`, height: `${BOOKMARK_DIMENSIONS.CARD_HEIGHT}px` }}>
      {/* Book Card Container - positioned at top-20px to allow spine to extend above */}
      <button
        type="button"
        onClick={onClick}
        aria-label={isLocked ? '프로필 북 보기 (인증 필요)' : `${name}님의 프로필 북 보기`}
        className={`absolute ${config.background} left-0 overflow-clip rounded-br-[12px] rounded-tr-[12px] top-[20px] transition-transform duration-200 hover:scale-105 active:scale-95`}
        style={{
          height: `${BOOKMARK_DIMENSIONS.CARD_BODY_HEIGHT}px`,
          width: `${BOOKMARK_DIMENSIONS.CARD_WIDTH}px`
        }}
      >
        {/* Book Spine - 140px tall, starts at card top edge, extends 20px above card into wrapper space */}
        <div
          className={`absolute ${config.spine} left-0 top-0 z-0`}
          style={{
            height: `${BOOKMARK_DIMENSIONS.CARD_HEIGHT}px`,
            width: `${BOOKMARK_DIMENSIONS.SPINE_WIDTH}px`
          }}
        />

        {/* Profile Content Container */}
        <div className="absolute left-[25px] top-[16px] w-[60px] flex flex-col items-center gap-[6px] z-10">
          {isLocked ? (
            // Locked state: Blurred profile image (각 카드마다 다른 이미지)
            <div
              className="relative rounded-full overflow-hidden blur-[5px]"
              style={{
                height: `${BOOKMARK_DIMENSIONS.PROFILE_SIZE_LOCKED}px`,
                width: `${BOOKMARK_DIMENSIONS.PROFILE_SIZE_LOCKED}px`
              }}
            >
              <Image
                src={lockedImage || '/image/today-library/locked-profile-1.png'}
                alt="잠긴 프로필 이미지"
                fill
                unoptimized
                className="object-cover"
                sizes={`${BOOKMARK_DIMENSIONS.PROFILE_SIZE_LOCKED}px`}
              />
            </div>
          ) : (
            // Unlocked state: Clear profile
            <div
              className="relative rounded-full overflow-hidden"
              style={{
                width: `${BOOKMARK_DIMENSIONS.PROFILE_SIZE_UNLOCKED}px`,
                height: `${BOOKMARK_DIMENSIONS.PROFILE_SIZE_UNLOCKED}px`
              }}
            >
              <Image
                src={profileImage}
                alt={name}
                fill
                unoptimized
                className="object-cover"
                sizes={`${BOOKMARK_DIMENSIONS.PROFILE_SIZE_UNLOCKED}px`}
              />
            </div>
          )}

          {/* Name Label (only for unlocked state) */}
          {!isLocked && (
            <div className="flex flex-col items-start w-full">
              <p className="font-[family-name:var(--font-pretendard)] font-semibold text-body-base text-text-primary text-center w-full">
                {getFirstName(name)}
              </p>
            </div>
          )}
        </div>

        {/* Bookmark Flag - at right edge, above profile */}
        <div className="absolute h-[32px] left-[69px] top-0 w-[21px] z-20" aria-hidden="true">
            <div className="relative size-full">
              <Image
                alt=""
                src={config.flagSvg}
                fill
                unoptimized
                sizes="21px"
                className="block max-w-none size-full object-contain"
              />
            </div>
          </div>

        {/* Lock Icon (only for locked state) */}
        {isLocked && (
          <div
            className="absolute left-[31px] top-[68px] z-10"
            style={{
              width: `${BOOKMARK_DIMENSIONS.LOCK_ICON_SIZE}px`,
              height: `${BOOKMARK_DIMENSIONS.LOCK_ICON_SIZE}px`
            }}
            aria-hidden="true"
          >
            <div className="relative size-full">
              <Image
                alt="잠금 아이콘"
                src={config.lockSvg}
                fill
                unoptimized
                sizes={`${BOOKMARK_DIMENSIONS.LOCK_ICON_SIZE}px`}
                className="block max-w-none size-full object-contain"
              />
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
