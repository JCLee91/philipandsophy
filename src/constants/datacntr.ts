/**
 * Data Center 관련 상수
 */

/**
 * React Query 캐시 설정
 */
export const DATACNTR_QUERY_CONFIG = {
  STATS_STALE_TIME: 5 * 60 * 1000,    // 5분
  STATS_REFETCH_INTERVAL: 60 * 1000,  // 1분
  ACTIVITY_STALE_TIME: 5 * 60 * 1000, // 5분
  DEFAULT_ACTIVITY_DAYS: 7,           // 기본 7일
} as const;
