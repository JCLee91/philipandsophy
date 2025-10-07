'use client';

import { BOOKMARK_DIMENSIONS, BOOKMARK_THEMES } from '@/constants/today-library';

interface BookmarkCardSkeletonProps {
  theme: 'blue' | 'yellow';
}

export default function BookmarkCardSkeleton({ theme }: BookmarkCardSkeletonProps) {
  const config = {
    spine: BOOKMARK_THEMES[theme].skeletonSpine,
    background: BOOKMARK_THEMES[theme].skeletonBackground,
  };

  return (
    <div className="relative animate-pulse" style={{ width: `${BOOKMARK_DIMENSIONS.CARD_WIDTH}px`, height: `${BOOKMARK_DIMENSIONS.CARD_HEIGHT}px` }}>
      <div
        className={`absolute ${config.background} left-0 overflow-clip rounded-br-[12px] rounded-tr-[12px] top-[20px]`}
        style={{
          height: `${BOOKMARK_DIMENSIONS.CARD_BODY_HEIGHT}px`,
          width: `${BOOKMARK_DIMENSIONS.CARD_WIDTH}px`
        }}
      >
        {/* Book Spine Skeleton */}
        <div
          className={`absolute ${config.spine} left-0 top-0`}
          style={{
            height: `${BOOKMARK_DIMENSIONS.CARD_HEIGHT}px`,
            width: `${BOOKMARK_DIMENSIONS.SPINE_WIDTH}px`
          }}
        />

        {/* Profile Skeleton */}
        <div className="absolute left-[25px] top-[16px] w-[60px] flex flex-col items-center gap-2">
          <div
            className="rounded-full bg-gray-300"
            style={{
              width: `${BOOKMARK_DIMENSIONS.PROFILE_SIZE_UNLOCKED}px`,
              height: `${BOOKMARK_DIMENSIONS.PROFILE_SIZE_UNLOCKED}px`
            }}
          />
          <div className="h-4 w-full bg-gray-300 rounded" />
        </div>

        {/* Flag Skeleton */}
        <div className="absolute h-[32px] left-[69px] top-0 w-[21px] bg-gray-300 rounded" />
      </div>
    </div>
  );
}
