export const APP_CONSTANTS = {
  ADMIN_NAME: '필립앤소피',
  LOCAL_NOTICE_PREFIX: 'local-',
  SCROLL_DELAY: 100,
  STORAGE_KEY_PREFIX: 'notices_',
  DEFAULT_PROFILE_IMAGE: '/image/default-profile.svg',

  // Date & Time
  DATE_FORMAT: 'yyyy-MM-dd' as const,
  MIDNIGHT_CHECK_INTERVAL: 60000, // 1분 (밀리초)

  // LocalStorage Keys
  STORAGE_KEY_VIEW_MODE: 'pns-view-mode',
} as const;

// System IDs
export const SYSTEM_IDS = {
  ADMIN: 'admin',
} as const;
