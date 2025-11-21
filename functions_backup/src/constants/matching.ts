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
} as const;
