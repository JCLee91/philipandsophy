/**
 * AI 매칭 시스템 상수
 *
 * Human-in-the-loop 매칭 프로세스에서 사용되는 설정값들
 */

export const MATCHING_CONFIG = {
  /** Firebase 참가자 정보 batch read 크기 (Firestore 'in' 쿼리 최대값) */
  BATCH_SIZE: 10,

  /** 성별 균형 매칭을 위한 각 성별당 최소 참가자 수 */
  MIN_PER_GENDER: 3,

  /** 매칭 실행에 필요한 최소 참가자 수 (성별 무관) */
  MIN_PARTICIPANTS: 4,

  /** 매칭 실행에 필요한 최소 제출물 수 */
  MIN_SUBMISSIONS_FOR_MATCHING: 4,

  /** AI 매칭 API 타임아웃 (밀리초) */
  AI_MATCHING_TIMEOUT_MS: 30000,

  /** AI 매칭 실패 시 최대 재시도 횟수 */
  MAX_RETRY_ATTEMPTS: 3,
} as const;

/**
 * Rate limiting 설정
 */
export const RATE_LIMIT_CONFIG = {
  /** 관리자별 rate limit: 1분당 최대 요청 수 */
  USER_MAX_REQUESTS: 3,

  /** 관리자별 rate limit: 시간 윈도우 (밀리초) */
  USER_WINDOW_MS: 60000,

  /** 전역 rate limit: 1분당 최대 요청 수 */
  GLOBAL_MAX_REQUESTS: 10,

  /** 전역 rate limit: 시간 윈도우 (밀리초) */
  GLOBAL_WINDOW_MS: 60000,
} as const;

/**
 * Featured 참가자 구성
 */
export const FEATURED_CONFIG = {
  /** Featured Similar 슬롯 개수 */
  SIMILAR_SLOTS: 2,

  /** Featured Opposite 슬롯 개수 */
  OPPOSITE_SLOTS: 2,
} as const;
