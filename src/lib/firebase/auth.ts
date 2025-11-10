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
    callback: () => {},
    'expired-callback': () => {},
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
  const e164Number = phoneFormatUtils.toE164(phoneNumber);

  return await signInWithPhoneNumber(auth, e164Number, recaptchaVerifier);
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

  // 인증 코드 길이 검증
  const cleanCode = verificationCode.replace(/[^\d]/g, '');
  if (cleanCode.length !== PHONE_VALIDATION.VERIFICATION_CODE_LENGTH) {
    throw new Error(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
  }

  try {
    const userCredential = await confirmationResult.confirm(cleanCode);

    return userCredential;
  } catch (error: any) {

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

    return userCredential;
  } catch (error: any) {

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

  } catch (error) {

    throw new Error(AUTH_ERROR_MESSAGES.LOGOUT_FAILED);
  }
}

