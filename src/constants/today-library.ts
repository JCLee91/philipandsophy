export const BOOKMARK_DIMENSIONS = {
  CARD_WIDTH: 100,
  CARD_HEIGHT: 140,
  CARD_BODY_HEIGHT: 120,
  SPINE_WIDTH: 10,
  PROFILE_SIZE_LOCKED: 50,
  PROFILE_SIZE_UNLOCKED: 58,
  LOCK_ICON_SIZE: 48,
} as const;

export const SHADOW_OFFSETS = {
  TOP_ROW: 128,
  BOTTOM_ROW: 148,
} as const;

export const SPACING = {
  CARD_GAP: 44,
  SECTION_GAP: 12,
} as const;

/**
 * 북마크 카드 테마 설정
 * blue: 비슷한 취향의 프로필 (Similar)
 * yellow: 반대 취향의 프로필 (Opposite)
 */
export const BOOKMARK_THEMES = {
  blue: {
    spine: 'bg-library-blue',
    background: 'bg-library-blue-light',
    skeletonSpine: 'bg-library-blue/20',
    skeletonBackground: 'bg-library-blue-light/40',
    flagSvg: '/image/today-library/blue-flag.svg',
    lockSvg: '/image/today-library/lock-icon.svg',
  },
  yellow: {
    spine: 'bg-library-yellow',
    background: 'bg-library-yellow-light',
    skeletonSpine: 'bg-library-yellow/20',
    skeletonBackground: 'bg-library-yellow-light/40',
    flagSvg: '/image/today-library/yellow-flag.svg',
    lockSvg: '/image/today-library/lock-icon.svg',
  },
} as const;
