'use client';

import {
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  UserCredential,
  signOut as firebaseSignOut,
  ApplicationVerifier,
} from 'firebase/auth';
import { getFirebaseAuth } from './client';
import { logger } from '@/lib/logger';
import { withTimeout } from '@/lib/utils';
import { phoneFormatUtils } from '@/constants/phone-format';

/**
 * Enhanced Firebase Phone Authentication with Modern UX
 * - Auto SMS detection
 * - Timeout handling
 * - Retry logic
 * - Better error messages
 */

// 타임아웃 설정
const SMS_SEND_TIMEOUT = 30000; // 30초
const SMS_VERIFY_TIMEOUT = 30000; // 30초
const AUTO_VERIFY_TIMEOUT = 5000; // 5초 (자동 인증 대기)

// ❌ REMOVED: withTimeout 중복 제거 (utils.ts에서 import)

/**
 * Initialize invisible reCAPTCHA
 */
export function initInvisibleRecaptcha(): RecaptchaVerifier {
  const auth = getFirebaseAuth();

  return new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {},
  });
}

/**
 * Enhanced SMS verification sending with timeout
 */
export async function sendSmsWithTimeout(
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const e164Number = phoneFormatUtils.toE164(phoneNumber);

  try {
    logger.info('Sending SMS to', e164Number);

    const confirmationResult = await withTimeout(
      signInWithPhoneNumber(auth, e164Number, recaptchaVerifier),
      SMS_SEND_TIMEOUT,
      'SMS 발송 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
    );

    logger.info('SMS sent successfully');
    return confirmationResult;

  } catch (error: any) {
    logger.error('SMS send failed:', error);

    // Specific error handling
    if (error.code === 'auth/too-many-requests') {
      throw new Error('너무 많은 요청입니다. 잠시 후 다시 시도해주세요.');
    }
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('올바르지 않은 전화번호입니다.');
    }
    if (error.code === 'auth/missing-phone-number') {
      throw new Error('전화번호를 입력해주세요.');
    }
    if (error.message?.includes('시간이 초과')) {
      throw error;
    }

    throw new Error('SMS 발송에 실패했습니다. 네트워크를 확인해주세요.');
  }
}

/**
 * Verify SMS code with timeout and retry
 */
export async function verifySmsWithTimeout(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<UserCredential> {
  const cleanCode = verificationCode.replace(/[^\d]/g, '');

  if (cleanCode.length !== 6) {
    throw new Error('6자리 인증번호를 입력해주세요.');
  }

  try {
    logger.info('Verifying SMS code');

    const userCredential = await withTimeout(
      confirmationResult.confirm(cleanCode),
      SMS_VERIFY_TIMEOUT,
      '인증 시간이 초과되었습니다. 다시 시도해주세요.'
    );

    logger.info('SMS verification successful');
    return userCredential;

  } catch (error: any) {
    logger.error('SMS verification failed:', error);

    // Specific error handling
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('인증번호가 올바르지 않습니다.');
    }
    if (error.code === 'auth/code-expired') {
      throw new Error('인증번호가 만료되었습니다. 다시 요청해주세요.');
    }
    if (error.message?.includes('시간이 초과')) {
      throw error;
    }

    throw new Error('인증에 실패했습니다. 다시 시도해주세요.');
  }
}

/**
 * Setup Web OTP API for auto SMS detection (if supported)
 */
export function setupWebOTPAutoFill(
  onCodeReceived: (code: string) => void
): (() => void) | null {
  // Check if Web OTP API is supported
  if (!('OTPCredential' in window)) {
    logger.info('Web OTP API not supported');
    return null;
  }

  const abortController = new AbortController();

  // Request OTP
  (navigator.credentials as any)
    .get({
      otp: { transport: ['sms'] },
      signal: abortController.signal,
    })
    .then((otp: any) => {
      if (otp?.code) {
        logger.info('OTP auto-detected:', otp.code);
        onCodeReceived(otp.code);
      }
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        logger.warn('OTP auto-detection failed:', err);
      }
    });

  // Return cleanup function
  return () => {
    abortController.abort();
  };
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.code === 'auth/invalid-verification-code' ||
        error.code === 'auth/invalid-phone-number'
      ) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelayMs * Math.pow(2, i);
      logger.info(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();

  try {
    await firebaseSignOut(auth);
    logger.info('User signed out');
  } catch (error) {
    logger.error('Sign out failed:', error);
    throw new Error('로그아웃에 실패했습니다.');
  }
}