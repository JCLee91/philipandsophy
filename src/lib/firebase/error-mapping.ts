import { AUTH_ERROR_MESSAGES } from '@/constants/auth';

/**
 * Firebase Auth 에러 코드를 한국어 메시지로 변환합니다.
 * 
 * @param error - Firebase Error 객체 또는 에러 메시지 문자열
 * @returns 사용자 친화적인 한국어 에러 메시지
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return AUTH_ERROR_MESSAGES.AUTH_FAILED;

  // 에러 코드 추출
  const code = error.code || '';
  const message = error.message || '';

  // 1. 전화번호 관련 에러
  if (code === 'auth/invalid-phone-number' || code === 'auth/missing-phone-number') {
    return AUTH_ERROR_MESSAGES.INVALID_PHONE_FORMAT;
  }

  // 2. 인증 코드 관련 에러
  if (code === 'auth/invalid-verification-code') {
    return AUTH_ERROR_MESSAGES.INVALID_CODE;
  }
  if (code === 'auth/code-expired') {
    return AUTH_ERROR_MESSAGES.CODE_EXPIRED;
  }

  // 3. SMS 전송 및 할당량 관련 에러
  if (code === 'auth/too-many-requests') {
    return AUTH_ERROR_MESSAGES.TOO_MANY_REQUESTS;
  }
  if (code === 'auth/quota-exceeded') {
    return AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED;
  }

  // 4. 네트워크 및 보안 관련 에러
  if (code === 'auth/network-request-failed') {
    return AUTH_ERROR_MESSAGES.NETWORK_FAILED;
  }
  if (code === 'auth/captcha-check-failed' || code === 'auth/web-storage-unsupported') {
    return AUTH_ERROR_MESSAGES.CAPTCHA_FAILED;
  }

  // 5. 사용자 계정 관련 에러
  if (code === 'auth/user-disabled') {
    return '계정이 비활성화되었습니다. 관리자에게 문의해주세요.';
  }
  if (code === 'auth/operation-not-allowed') {
    return '일시적인 시스템 오류입니다. 잠시 후 다시 시도해주세요.';
  }

  // 6. 이미 알려진 커스텀 에러 메시지는 그대로 반환
  if (Object.values(AUTH_ERROR_MESSAGES).includes(message)) {
    return message;
  }

  // 7. 기본 폴백 메시지
  return AUTH_ERROR_MESSAGES.AUTH_FAILED;
}

