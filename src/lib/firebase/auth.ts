'use client';

/**
 * Firebase Phone Authentication
 *
 * 전화번호 기반 인증 기능
 * - RecaptchaVerifier 초기화
 * - SMS 인증 코드 전송
 * - 인증 코드 확인
 * - 로그아웃
 */

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { initializeFirebase } from './client';
import { logger } from '@/lib/logger';
import {
  PHONE_VALIDATION,
  RECAPTCHA_CONFIG,
  AUTH_ERROR_MESSAGES,
  FIREBASE_ERROR_CODE_MAP,
} from '@/constants/auth';

/**
 * reCAPTCHA Verifier 초기화
 *
 * @param containerId - reCAPTCHA 컨테이너 DOM 요소 ID (default: 'recaptcha-container')
 * @param size - 'invisible' | 'normal' (default: 'invisible')
 * @returns RecaptchaVerifier 인스턴스
 *
 * @example
 * ```tsx
 * // 컴포넌트에서 사용
 * useEffect(() => {
 *   const verifier = initRecaptcha('recaptcha-container', 'invisible');
 *   return () => {
 *     verifier.clear(); // cleanup
 *   };
 * }, []);
 * ```
 */
export function initRecaptcha(
  containerId: string = RECAPTCHA_CONFIG.CONTAINER_ID,
  size: 'invisible' | 'normal' = RECAPTCHA_CONFIG.DEFAULT_SIZE
): RecaptchaVerifier {
  const { auth } = initializeFirebase();

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size,
    callback: (response: string) => {
      logger.debug('reCAPTCHA 검증 완료', { response });
    },
    'expired-callback': () => {
      logger.warn('reCAPTCHA 만료됨');
    },
  });

  logger.debug('RecaptchaVerifier 초기화 완료', { containerId, size });
  return verifier;
}

/**
 * SMS 인증 코드 전송
 *
 * @param phoneNumber - 11자리 전화번호 (하이픈 제외, 예: 01012345678)
 * @param recaptchaVerifier - RecaptchaVerifier 인스턴스
 * @returns ConfirmationResult (인증 코드 확인용)
 *
 * @throws Error - SMS 전송 실패 시 (사용자 친화적 메시지)
 *
 * @example
 * ```tsx
 * const verifier = initRecaptcha();
 * const confirmationResult = await sendSmsVerification('01012345678', verifier);
 * // 사용자에게 SMS 코드 입력 받기
 * ```
 */
export async function sendSmsVerification(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    const { auth } = initializeFirebase();

    // E.164 형식으로 변환: 010-1234-5678 → +821012345678
    // phoneNumber는 이미 하이픈 제거된 상태로 전달됨 (01012345678)
    const formattedPhone = `${PHONE_VALIDATION.COUNTRY_CODE}${phoneNumber.substring(1)}`;

    logger.info('SMS 전송 시작', { phoneNumber: formattedPhone });

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      recaptchaVerifier
    );

    logger.info('SMS 전송 성공');
    return confirmationResult;

  } catch (error: any) {
    const errorCode = error.code;
    const errorMessage = FIREBASE_ERROR_CODE_MAP[errorCode] || AUTH_ERROR_MESSAGES.SMS_SEND_FAILED;

    logger.error('SMS 전송 실패', { errorCode, errorMessage });
    throw new Error(errorMessage);
  }
}

/**
 * SMS 인증 코드 확인
 *
 * @param confirmationResult - sendSmsVerification()의 반환값
 * @param verificationCode - 6자리 인증 코드
 * @returns UserCredential (Firebase User 정보)
 *
 * @throws Error - 인증 코드 확인 실패 시 (사용자 친화적 메시지)
 *
 * @example
 * ```tsx
 * const userCredential = await confirmSmsCode(confirmationResult, '123456');
 * console.log('Firebase UID:', userCredential.user.uid);
 * ```
 */
export async function confirmSmsCode(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<UserCredential> {
  try {
    logger.info('인증 코드 확인 시작');

    const userCredential = await confirmationResult.confirm(verificationCode);

    logger.info('Firebase 로그인 성공', { uid: userCredential.user.uid });
    return userCredential;

  } catch (error: any) {
    const errorCode = error.code;
    const errorMessage = FIREBASE_ERROR_CODE_MAP[errorCode] || AUTH_ERROR_MESSAGES.INVALID_CODE;

    logger.error('인증 코드 확인 실패', { errorCode, errorMessage });
    throw new Error(errorMessage);
  }
}

/**
 * Auth 인스턴스 가져오기
 *
 * @returns Firebase Auth 인스턴스
 *
 * @example
 * ```tsx
 * const auth = getAuthInstance();
 * const user = auth.currentUser;
 * const idToken = await user?.getIdToken();
 * ```
 */
export function getAuthInstance() {
  const { auth } = initializeFirebase();
  return auth;
}

/**
 * 로그아웃
 *
 * Firebase Auth에서 로그아웃하고 모든 세션 정보를 제거합니다.
 *
 * @example
 * ```tsx
 * await signOut();
 * router.push('/app'); // 로그인 페이지로 리다이렉트
 * ```
 */
export async function signOut() {
  const { auth } = initializeFirebase();
  await firebaseSignOut(auth);
  logger.info('로그아웃 완료');
}
