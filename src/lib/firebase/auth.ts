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
import { getFirebaseAuth } from './client';
import { logger } from '@/lib/logger';
import {
  PHONE_VALIDATION,
  AUTH_ERROR_MESSAGES,
  RECAPTCHA_CONFIG,
} from '@/constants/auth';
import { phoneFormatUtils } from '@/constants/phone-format';

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
  const auth = getFirebaseAuth();

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
  const auth = getFirebaseAuth();

  // 기존 유틸리티 함수로 E.164 변환 (DRY)
  const e164Number = phoneFormatUtils.toE164(phoneNumber);

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
    throw new Error(AUTH_ERROR_MESSAGES.SMS_SEND_FAILED);
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
    throw new Error(AUTH_ERROR_MESSAGES.AUTH_FAILED);
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
  const auth = getFirebaseAuth();

  const credential = PhoneAuthProvider.credential(verificationId, verificationCode);

  try {
    const userCredential = await signInWithCredential(auth, credential);
    logger.info('전화번호 로그인 성공', { uid: userCredential.user.uid });
    return userCredential;
  } catch (error: any) {
    logger.error('전화번호 로그인 실패:', error);
    throw new Error(AUTH_ERROR_MESSAGES.AUTH_FAILED);
  }
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();

  try {
    await firebaseSignOut(auth);
    logger.info('로그아웃 성공');
  } catch (error) {
    logger.error('로그아웃 실패:', error);
    throw new Error(AUTH_ERROR_MESSAGES.LOGOUT_FAILED);
  }
}

