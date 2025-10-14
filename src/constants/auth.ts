/**
 * Data Center 인증 관련 상수
 */

/**
 * 허용된 이메일 도메인 (회원가입 제한)
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'wheelslabs.com',      // 휠즈랩스 공식 도메인
  'philipandsophy.com',  // 필립앤소피 공식 도메인
] as const;

/**
 * 허용된 전화번호 국가 코드
 */
export const ALLOWED_PHONE_COUNTRY_CODES = ['+82'] as const; // 한국만 허용

/**
 * 이메일 도메인 검증
 */
export function validateEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain as any);
}

/**
 * 전화번호 국가 코드 검증
 */
export function validatePhoneCountryCode(phoneNumber: string): boolean {
  return ALLOWED_PHONE_COUNTRY_CODES.some(code => phoneNumber.startsWith(code));
}

/**
 * 허용된 도메인 표시 문자열
 */
export const ALLOWED_DOMAINS_TEXT = ALLOWED_EMAIL_DOMAINS.join(', ');
