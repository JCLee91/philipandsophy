/**
 * 환영 페이지 관련 상수
 */

// 토큰 만료 기간 (일)
export const TOKEN_EXPIRY_DAYS = 30;

// 특별 할인 유효 기간 (시간) - 메시지 발송 후 3일 12시간 (84시간)
export const DISCOUNT_EXPIRY_HOURS = 84;

// Firestore 문서 경로
export const WELCOME_CONFIG_COLLECTION = 'config';
export const WELCOME_CONFIG_DOC_ID = 'welcome';
