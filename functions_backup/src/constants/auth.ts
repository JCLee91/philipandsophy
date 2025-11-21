/**
 * Data Center 인증 관련 상수 (Cloud Functions)
 */

/**
 * 허용된 이메일 도메인 (회원가입 제한)
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'wheelslabs.kr',       // 휠즈랩스 공식 도메인
] as const;

/**
 * 허용된 전화번호 국가 코드
 */
export const ALLOWED_PHONE_COUNTRY_CODES = ['+82'] as const; // 한국만 허용

/**
 * 허용된 도메인 표시 문자열
 */
export const ALLOWED_DOMAINS_TEXT = ALLOWED_EMAIL_DOMAINS.join(', ');
