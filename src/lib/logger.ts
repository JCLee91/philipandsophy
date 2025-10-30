/**
 * Logger Utility
 * - 개발 환경: console 출력
 * - 프로덕션 환경: console 출력 + 향후 Sentry 통합 가능
 * - Firebase Functions: functions.logger 사용
 *
 * 사용법:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.error('오류 발생', error);
 * logger.warn('경고 메시지', { userId: '123' });
 * logger.info('정보 로그', { action: 'create' });
 * logger.debug('디버그 정보', data);
 * ```
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * 데이터를 안전하게 문자열로 변환
 */
function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export const logger = {
  /**
   * 에러 로깅 (심각한 오류)
   * - 개발: console.error
   * - 프로덕션: console.error + 향후 Sentry
   */
  error: (message: string, errorOrData?: unknown) => {
    const timestamp = new Date().toISOString();

    if (errorOrData instanceof Error) {
      console.error(`[ERROR] ${timestamp} - ${message}`, {
        error: errorOrData.message,
        stack: errorOrData.stack,
      });
    } else if (errorOrData !== undefined) {
      console.error(`[ERROR] ${timestamp} - ${message}`, safeStringify(errorOrData));
    } else {
      console.error(`[ERROR] ${timestamp} - ${message}`);
    }

    // TODO: 프로덕션에서 Sentry로 전송
    // if (isProduction && typeof window !== 'undefined') {
    //   Sentry.captureException(errorOrData, {
    //     extra: { message, timestamp }
    //   });
    // }
  },

  /**
   * 경고 로깅 (주의가 필요한 상황)
   * - 개발/프로덕션 모두 출력
   */
  warn: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();

    if (data !== undefined) {
      console.warn(`[WARN] ${timestamp} - ${message}`, safeStringify(data));
    } else {
      console.warn(`[WARN] ${timestamp} - ${message}`);
    }
  },

  /**
   * 정보 로깅 (일반적인 정보)
   * - 개발/프로덕션 모두 출력
   */
  info: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();

    if (data !== undefined) {
      console.log(`[INFO] ${timestamp} - ${message}`, safeStringify(data));
    } else {
      console.log(`[INFO] ${timestamp} - ${message}`);
    }
  },

  /**
   * 디버그 로깅 (개발용 상세 정보)
   * - 개발 환경에서만 출력
   */
  debug: (message: string, data?: unknown) => {
    if (!isDevelopment) return;

    const timestamp = new Date().toISOString();

    if (data !== undefined) {
      console.debug(`[DEBUG] ${timestamp} - ${message}`, safeStringify(data));
    } else {
      console.debug(`[DEBUG] ${timestamp} - ${message}`);
    }
  },
};
