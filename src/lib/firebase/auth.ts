'use client';

import {
  signInWithPhoneNumber,
  signInWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  UserCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getAuthInstance } from './config';
import { logger } from '@/lib/logger';
import {
  PHONE_VALIDATION,
  AUTH_ERROR_MESSAGES,
  FIREBASE_ERROR_CODE_MAP,
  RECAPTCHA_CONFIG,
} from '@/constants/auth';

/**
 * Firebase Phone Authentication Utilities
 */

/**
 * reCAPTCHA Verifier 초기화
 *
 * @param containerId - reCAPTCHA를 렌더링할 DOM 요소 ID
 * @param size - reCAPTCHA 크기 ('invisible' | 'normal')
 * @returns RecaptchaVerifier 인스턴스
 */
export function initRecaptcha(
  containerId: string = RECAPTCHA_CONFIG.CONTAINER_ID,
  size: 'invisible' | 'normal' = RECAPTCHA_CONFIG.DEFAULT_SIZE
): RecaptchaVerifier {
  const auth = getAuthInstance();

  return new RecaptchaVerifier(auth, containerId, {
    size,
    callback: () => {
      logger.debug('reCAPTCHA solved');
    },
    'expired-callback': () => {
      logger.warn('reCAPTCHA expired');
    },
  });
}

/**
 * SMS 인증 코드 전송
 *
 * @param phoneNumber - 전화번호 (E.164 format: +821012345678)
 * @param recaptchaVerifier - reCAPTCHA Verifier 인스턴스
 * @returns ConfirmationResult (인증 코드 확인에 사용)
 */
export async function sendSmsVerification(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = getAuthInstance();

  // 기존 유틸리티 함수로 E.164 변환 (DRY)
  const e164Number = formatPhoneNumberToE164(phoneNumber);

  logger.debug('SMS 전송 시도:', { phoneNumber: e164Number });

  try {
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      e164Number,
      recaptchaVerifier
    );
    logger.info('SMS 전송 성공');
    return confirmationResult;
  } catch (error: any) {
    logger.error('SMS 전송 실패:', error);

    // Firebase 에러 코드를 사용자 친화적인 메시지로 변환
    const userMessage = FIREBASE_ERROR_CODE_MAP[error.code] ||
      `${AUTH_ERROR_MESSAGES.SMS_SEND_FAILED} (오류: ${error.code || 'UNKNOWN'})`;

    throw new Error(userMessage);
  }
}

/**
 * SMS 인증 코드 확인 및 로그인
 *
 * @param confirmationResult - sendSmsVerification에서 받은 결과
 * @param verificationCode - 사용자가 입력한 6자리 인증 코드
 * @returns UserCredential (로그인 성공 시)
 */
export async function confirmSmsCode(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<UserCredential> {
  logger.debug('인증 코드 확인 시도');

  // 인증 코드 길이 검증
  const cleanCode = verificationCode.replace(/[^\d]/g, '');
  if (cleanCode.length !== PHONE_VALIDATION.VERIFICATION_CODE_LENGTH) {
    throw new Error(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
  }

  try {
    const userCredential = await confirmationResult.confirm(cleanCode);
    logger.info('인증 코드 확인 성공', { uid: userCredential.user.uid });
    return userCredential;
  } catch (error: any) {
    logger.error('인증 코드 확인 실패:', error);

    // Firebase 에러 코드를 사용자 친화적인 메시지로 변환
    const userMessage = FIREBASE_ERROR_CODE_MAP[error.code] ||
      AUTH_ERROR_MESSAGES.AUTH_FAILED;

    throw new Error(userMessage);
  }
}

/**
 * 전화번호와 인증 코드로 직접 로그인 (고급)
 *
 * @param verificationId - SMS 전송 후 받은 verification ID
 * @param verificationCode - 사용자가 입력한 6자리 인증 코드
 * @returns UserCredential (로그인 성공 시)
 */
export async function signInWithPhoneCredential(
  verificationId: string,
  verificationCode: string
): Promise<UserCredential> {
  const auth = getAuthInstance();

  const credential = PhoneAuthProvider.credential(verificationId, verificationCode);

  try {
    const userCredential = await signInWithCredential(auth, credential);
    logger.info('전화번호 로그인 성공', { uid: userCredential.user.uid });
    return userCredential;
  } catch (error: any) {
    logger.error('전화번호 로그인 실패:', error);

    const userMessage = FIREBASE_ERROR_CODE_MAP[error.code] ||
      AUTH_ERROR_MESSAGES.AUTH_FAILED;

    throw new Error(userMessage);
  }
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  const auth = getAuthInstance();

  try {
    await firebaseSignOut(auth);
    logger.info('로그아웃 성공');
  } catch (error) {
    logger.error('로그아웃 실패:', error);
    throw new Error(AUTH_ERROR_MESSAGES.LOGOUT_FAILED);
  }
}

/**
 * 전화번호 형식 변환 유틸리티
 */
export function formatPhoneNumberForDisplay(e164Number: string): string {
  // +821012345678 → 010-1234-5678
  if (!e164Number.startsWith('+82')) {
    return e164Number;
  }

  const withoutPrefix = '0' + e164Number.slice(3);
  if (withoutPrefix.length !== 11) {
    return e164Number;
  }

  return `${withoutPrefix.slice(0, 3)}-${withoutPrefix.slice(3, 7)}-${withoutPrefix.slice(7, 11)}`;
}

export function formatPhoneNumberToE164(phoneNumber: string): string {
  // 010-1234-5678 → +821012345678
  const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

  if (
    !cleanNumber.startsWith(PHONE_VALIDATION.KOREAN_PREFIX) ||
    cleanNumber.length !== PHONE_VALIDATION.PHONE_LENGTH
  ) {
    throw new Error(AUTH_ERROR_MESSAGES.INVALID_PHONE_SHORT);
  }

  return `${PHONE_VALIDATION.COUNTRY_CODE}${cleanNumber.slice(1)}`;
}

// Re-export from config
export { getAuthInstance } from './config';
