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
  containerId: string,
  size: 'invisible' | 'normal' = 'invisible'
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

  // 한국 전화번호 형식 검증 및 변환
  const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
  if (!cleanNumber.startsWith('010') || cleanNumber.length !== 11) {
    throw new Error('올바른 휴대폰 번호를 입력해주세요. (010-XXXX-XXXX)');
  }

  // E.164 형식으로 변환: +82 10 XXXX XXXX
  const e164Number = `+82${cleanNumber.slice(1)}`;

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

    // Firebase 에러 메시지를 사용자 친화적으로 변환
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('올바른 휴대폰 번호를 입력해주세요.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('보안 인증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
    }

    throw new Error('SMS 전송에 실패했습니다. 다시 시도해주세요.');
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

  // 6자리 숫자 검증
  const cleanCode = verificationCode.replace(/[^\d]/g, '');
  if (cleanCode.length !== 6) {
    throw new Error('6자리 인증 코드를 입력해주세요.');
  }

  try {
    const userCredential = await confirmationResult.confirm(cleanCode);
    logger.info('인증 코드 확인 성공', { uid: userCredential.user.uid });
    return userCredential;
  } catch (error: any) {
    logger.error('인증 코드 확인 실패:', error);

    // Firebase 에러 메시지를 사용자 친화적으로 변환
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('인증 코드가 올바르지 않습니다. 다시 확인해주세요.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('인증 코드가 만료되었습니다. 다시 요청해주세요.');
    }

    throw new Error('인증에 실패했습니다. 다시 시도해주세요.');
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

    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('인증 코드가 올바르지 않습니다.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('인증 코드가 만료되었습니다.');
    }

    throw new Error('로그인에 실패했습니다.');
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
    throw new Error('로그아웃에 실패했습니다.');
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

  if (!cleanNumber.startsWith('010') || cleanNumber.length !== 11) {
    throw new Error('올바른 휴대폰 번호를 입력해주세요.');
  }

  return `+82${cleanNumber.slice(1)}`;
}
