/**
 * 프로필북 테마 색상 상수
 * - similar: 비슷한 가치관 (파란색 테마)
 * - opposite: 반대 가치관 (노란색 테마)
 */
export const PROFILE_THEMES = {
  similar: {
    background: '#dceeff',
    accent: '#45A1FD',
    accentLight: '#F3F8FF',
    bookBorder: '#45a1fd',
    bookmarkCompleted: '/icons/book-bookmark-completed.svg',
    bookmarkEmpty: '/icons/book-bookmark-empty.svg',
  },
  opposite: {
    background: '#fff6dc',
    accent: '#FFBF1F',
    accentLight: '#FFFDF3',
    bookBorder: '#FFD362',
    bookmarkCompleted: '/icons/book-bookmark-completed-yellow.svg',
    bookmarkEmpty: '/icons/book-bookmark-empty.svg',
  }
} as const;

export type ProfileTheme = keyof typeof PROFILE_THEMES;

/**
 * 기본 테마는 파란색 (비슷한 가치관)
 */
export const DEFAULT_THEME: ProfileTheme = 'similar';
