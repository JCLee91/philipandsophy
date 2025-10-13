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
  /** Notice notification */
  NOTICE: (preview: string) => `📢 ${preview}`,

  /** Matching result notification */
  MATCHING: "📚 오늘의 프로필북이 도착했어요",
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
