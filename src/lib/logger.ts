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
  error: (message: string, errorOrData?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      if (errorOrData instanceof Error) {
        console.error(message, {
          name: errorOrData.name,
          message: errorOrData.message,
          stack: errorOrData.stack,
        });
      } else if (errorOrData !== undefined) {
        // 일반 객체나 값을 JSON으로 직렬화하여 출력
        try {
          console.error(message, JSON.stringify(errorOrData, null, 2));
        } catch {
          // 순환 참조 등으로 직렬화 실패 시 원본 출력
          console.error(message, errorOrData);
        }
      } else {
        console.error(message);
      }
    }
    // TODO: 프로덕션에서 Sentry 등으로 전송
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(errorOrData, { extra: { message } });
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
