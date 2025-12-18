/**
 * 환영 페이지 설정 (계좌 정보)
 * Firestore: config/welcome
 */
export interface WelcomeConfig {
  bankName: string; // 은행명
  accountNumber: string; // 계좌번호
  accountHolder: string; // 예금주
  amountDescription: string; // "10만원"
  note?: string; // 추가 안내 문구
  updatedAt?: string; // 마지막 수정 시간 (ISO string)
  updatedBy?: string; // 수정한 관리자
}

export const DEFAULT_WELCOME_CONFIG: WelcomeConfig = {
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  amountDescription: '',
  note: '',
};

/**
 * 토큰 검증 API 응답
 */
export interface WelcomeVerifyResponse {
  success: boolean;
  participant?: {
    name: string;
    cohortName: string;
  };
  bankAccount?: WelcomeConfig;
  error?: string;
  code?: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'TOKEN_NOT_FOUND' | 'CONFIG_NOT_FOUND';
}

/**
 * 토큰 생성 API 응답
 */
export interface WelcomeTokenResponse {
  success: boolean;
  token?: string;
  welcomePageUrl?: string;
  participantName?: string;
  expiresAt?: string;
  error?: string;
  code?:
    | 'INVALID_SECRET'
    | 'PARTICIPANT_NOT_FOUND'
    | 'MISSING_PHONE_NUMBER'
    | 'SERVER_ERROR';
}
