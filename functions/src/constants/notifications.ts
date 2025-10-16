/**
 * Push notification constants
 * Centralized configuration for all notification-related values
 */

export const NOTIFICATION_CONFIG = {
  /** Maximum content length before truncation */
  MAX_CONTENT_LENGTH: 100,

  /** Brand name for notifications */
  BRAND_NAME: "필립앤소피",

  /** Icon and badge images */
  ICON_PATH: "/image/favicon.webp",
  BADGE_PATH: "/image/favicon.webp",

  /** Notification urgency level */
  URGENCY: "high" as const,
} as const;

export const NOTIFICATION_MESSAGES = {
  /** Notice notification title */
  NOTICE_TITLE: "새로운 공지가 등록되었습니다",

  /** Matching result notification title */
  MATCHING_TITLE: "오늘의 프로필북이 도착했습니다",
} as const;

export const NOTIFICATION_ROUTES = {
  /** Chat page */
  CHAT: "/app/chat",

  /** Today's library page */
  TODAY_LIBRARY: "/app/chat/today-library",
} as const;

export const NOTIFICATION_TYPES = {
  DM: "dm",
  NOTICE: "notice",
  MATCHING: "matching",
} as const;
