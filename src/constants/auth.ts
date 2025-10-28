/**
 * Firebase Authentication 상수
 *
 * - 데이터센터: 이메일 인증 (wheelslabs.kr 도메인만)
 * - 웹앱: 전화번호 인증 (한국 휴대폰 번호만)
 */

// ========================================
// 데이터센터 인증 (Email)
// ========================================

/**
 * 허용된 이메일 도메인 (회원가입 제한)
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'wheelslabs.kr', // 휠즈랩스 공식 도메인
] as const;

/**
 * 이메일 도메인 검증
 */
export function validateEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain as any);
}

/**
 * 허용된 도메인 표시 문자열
 */
export const ALLOWED_DOMAINS_TEXT = ALLOWED_EMAIL_DOMAINS.join(', ');

// ========================================
// 웹앱 인증 (Phone Number)
// ========================================

/**
 * 전화번호 검증 규칙
 */
export const PHONE_VALIDATION = {
  /** 한국 휴대폰 번호 접두사 */
  KOREAN_PREFIX: '010',
  /** 한국 휴대폰 번호 길이 (하이픈 제외) */
  PHONE_LENGTH: 11,
  /** 한국 국가 코드 (E.164 형식) */
  COUNTRY_CODE: '+82',
  /** SMS 인증 코드 길이 */
  VERIFICATION_CODE_LENGTH: 6,
} as const;

/**
 * 전화번호 국가 코드 검증
 */
export function validatePhoneCountryCode(phoneNumber: string): boolean {
  return phoneNumber.startsWith(PHONE_VALIDATION.COUNTRY_CODE);
}

/**
 * 인증 에러 메시지
 * 사용자 친화적인 한국어 메시지
 */
export const AUTH_ERROR_MESSAGES = {
  // 전화번호 관련
  INVALID_PHONE_FORMAT: '올바른 휴대폰 번호를 입력해주세요. (010-XXXX-XXXX)',
  INVALID_PHONE_SHORT: '올바른 휴대폰 번호를 입력해주세요.',
  PHONE_LENGTH_REQUIRED: '11자리 휴대폰 번호를 입력해주세요.',

  // 인증 코드 관련
  INVALID_VERIFICATION_CODE: '6자리 인증 코드를 입력해주세요.',
  INVALID_CODE: '인증 코드가 올바르지 않습니다. 다시 확인해주세요.',
  CODE_EXPIRED: '인증 코드가 만료되었습니다. 다시 요청해주세요.',

  // SMS 전송 관련
  SMS_SEND_FAILED: 'SMS 전송에 실패했습니다. 다시 시도해주세요.',
  TOO_MANY_REQUESTS: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  QUOTA_EXCEEDED: 'SMS 전송 한도를 초과했습니다. 관리자에게 문의해주세요.',

  // reCAPTCHA 관련
  CAPTCHA_FAILED: '보안 인증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.',
  CAPTCHA_INIT_FAILED: '보안 인증 초기화에 실패했습니다. 페이지를 새로고침해주세요.',

  // 네트워크 관련
  NETWORK_FAILED: '네트워크 연결을 확인해주세요.',

  // 인증 실패
  AUTH_FAILED: '인증에 실패했습니다. 다시 시도해주세요.',
  AUTH_SESSION_EXPIRED: '인증 세션이 만료되었습니다. 다시 시작해주세요.',

  // 로그아웃
  LOGOUT_FAILED: '로그아웃에 실패했습니다.',

  // 참가자 관련
  PARTICIPANT_NOT_FOUND: '등록되지 않은 번호입니다. 다시 확인해주세요.',
  PHONE_ALREADY_LINKED: '이 전화번호는 이미 다른 계정과 연결되어 있습니다. 관리자에게 문의해주세요.',

  // Firebase 앱 초기화
  FIREBASE_NOT_INITIALIZED:
    'Firebase app must be initialized before accessing Auth. Call initializeFirebase() in your app providers first.',
} as const;

/**
 * reCAPTCHA 설정
 */
export const RECAPTCHA_CONFIG = {
  /** reCAPTCHA 크기 (invisible | normal) */
  DEFAULT_SIZE: 'invisible' as const,
  /** reCAPTCHA 렌더링할 DOM 요소 ID */
  CONTAINER_ID: 'recaptcha-container',
} as const;

/**
 * 로컬스토리지 키
 */
export const STORAGE_KEYS = {
  /** 마지막 로그인 전화번호 */
  LAST_PHONE: 'pns-last-phone',
} as const;

/**
 * 인증 관련 타이밍 상수 (밀리초)
 */
export const AUTH_TIMING = {
  /** reCAPTCHA 초기화 지연 시간 (Firebase 초기화 대기) */
  RECAPTCHA_INIT_DELAY: 100,
  /** 네비게이션 후 재활성화 시간 (iOS PWA 전환 대기) */
  NAVIGATION_COOLDOWN: 500,
  /** 공지 스크롤 지연 시간 (DOM 렌더링 대기) */
  SCROLL_DELAY: 100,
} as const;
