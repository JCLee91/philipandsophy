/**
 * 세션 관리 관련 상수
 */

export const SESSION_CONFIG = {
  /**
   * 세션 만료 시간: 24시간 (밀리초)
   */
  SESSION_DURATION: 24 * 60 * 60 * 1000,

  /**
   * 세션 유예 시간: 5분 (밀리초)
   * 시계 오차 및 네트워크 지연을 고려한 grace period
   */
  GRACE_PERIOD: 5 * 60 * 1000,

  /**
   * 세션 자동 연장 임계값: 12시간 (밀리초)
   * 남은 세션 시간이 이 값보다 적으면 자동으로 24시간 연장
   */
  AUTO_EXTEND_THRESHOLD: 12 * 60 * 60 * 1000,

  /**
   * LocalStorage 키
   */
  STORAGE_KEY: 'pns-session',

  /**
   * 마지막 전화번호 저장 키
   */
  LAST_PHONE_KEY: 'pns-last-phone',

  /**
   * 네트워크 에러 재시도 설정
   */
  RETRY_CONFIG: {
    /**
     * 최대 재시도 횟수
     */
    MAX_RETRIES: 3,

    /**
     * 초기 재시도 대기 시간 (밀리초)
     * Exponential backoff: 1초 → 2초 → 4초
     */
    INITIAL_RETRY_DELAY: 1000,

    /**
     * 재시도 대기 시간 증가 배수
     */
    BACKOFF_MULTIPLIER: 2,
  },
} as const;

/**
 * 세션 연장 이유
 */
export const SESSION_EXTEND_REASON = {
  USER_ACTIVITY: 'user_activity',
  AUTO_EXTEND: 'auto_extend',
  LOGIN: 'login',
} as const;

export type SessionExtendReason = typeof SESSION_EXTEND_REASON[keyof typeof SESSION_EXTEND_REASON];
