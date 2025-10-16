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

/**
 * 색상 코드 (데이터 상태 표시)
 */
export const DATACNTR_COLORS = {
  SUCCESS: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
  },
  WARNING: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
  },
  DANGER: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
  },
  INFO: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  NEUTRAL: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
} as const;

/**
 * 참가자 활동 상태 기준
 */
export const ACTIVITY_THRESHOLDS = {
  ACTIVE_DAYS: 3,      // 3일 이내 활동 = 활성
  MODERATE_DAYS: 7,    // 7일 이내 활동 = 보통
  // 7일 이상 = 휴면
} as const;

/**
 * 인게이지먼트 점수 기준
 */
export const ENGAGEMENT_THRESHOLDS = {
  HIGH: 80,     // 80점 이상 = 우수
  MEDIUM: 50,   // 50-79점 = 보통
  // 50점 미만 = 저조
} as const;
