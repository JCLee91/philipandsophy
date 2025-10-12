'use client';

import BookmarkCard from '@/components/BookmarkCard';
import BookmarkCardSkeleton from '@/components/BookmarkCardSkeleton';
import EllipseShadow from '@/components/EllipseShadow';
import { SHADOW_OFFSETS, SPACING } from '@/constants/today-library';
import { APP_CONSTANTS } from '@/constants/app';
import { cn } from '@/lib/utils';

interface ParticipantData {
  id: string;
  name: string;
  profileImage?: string;
  profileImageCircle?: string;
  theme: 'similar' | 'opposite';
}

interface BookmarkRowProps {
  participants: ParticipantData[];
  theme: 'blue' | 'yellow';
  isLocked: boolean;
  isLoading?: boolean;
  onCardClick: (id: string, theme: 'similar' | 'opposite') => void;
}

/**
 * BookmarkRow - 오늘의 서재 북마크 카드 행 컴포넌트
 *
 * Blue theme (Similar): 비슷한 취향의 참가자 2명
 * Yellow theme (Opposite): 반대 취향의 참가자 2명
 */
export default function BookmarkRow({
  participants,
  theme,
  isLocked,
  isLoading,
  onCardClick
}: BookmarkRowProps) {
  const topOffset = theme === 'blue' ? SHADOW_OFFSETS.TOP_ROW : SHADOW_OFFSETS.BOTTOM_ROW;
  const gradientId = theme === 'blue' ? 'ellipse-gradient-1' : 'ellipse-gradient-2';
  const rowHeight = theme === 'blue' ? 'h-[140px]' : 'h-[160px]';
  const ptClass = theme === 'yellow' ? 'pt-6' : '';
  const lockedImageOffset = theme === 'blue' ? 1 : 3;

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={cn(rowHeight, "overflow-hidden relative w-full")}>
        <EllipseShadow topOffset={topOffset} gradientId={`${gradientId}-skeleton`} />
        <div className={cn("flex justify-center relative z-10", ptClass)} style={{ gap: `${SPACING.CARD_GAP}px` }}>
          <BookmarkCardSkeleton theme={theme} />
          <BookmarkCardSkeleton theme={theme} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(rowHeight, "overflow-hidden relative w-full")}>
      <EllipseShadow topOffset={topOffset} gradientId={gradientId} />
      <div className={cn("flex justify-center relative z-10", ptClass)} style={{ gap: `${SPACING.CARD_GAP}px` }}>
        {participants.map((participant, idx) => (
          <BookmarkCard
            key={`${participant.theme}-${participant.id}`}
            profileImage={
              participant.profileImageCircle ||
              participant.profileImage ||
              APP_CONSTANTS.DEFAULT_PROFILE_IMAGE
            }
            name={participant.name}
            theme={theme}
            isLocked={isLocked}
            lockedImage={`/image/today-library/locked-profile-${idx + lockedImageOffset}.png`}
            onClick={() => onCardClick(participant.id, participant.theme)}
          />
        ))}
      </div>
    </div>
  );
}
