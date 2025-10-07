/**
 * Logger Utility
 * 개발 환경에서는 console에 출력하고,
 * 프로덕션 환경에서는 에러를 숨기거나 모니터링 서비스로 전송합니다.
 */

export const logger = {
  /**
   * 에러 로깅
   * 프로덕션에서는 console에 출력하지 않고 향후 Sentry 등으로 전송 가능
   */
  error: (message: string, error?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(message, error);
    }
    // TODO: 프로덕션에서 Sentry 등으로 전송
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: { message } });
    // }
  },

  /**
   * 경고 로깅
   */
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, data);
    }
  },

  /**
   * 정보 로깅
   */
  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data);
    }
  },

  /**
   * 디버그 로깅
   */
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, data);
    }
  },
};
