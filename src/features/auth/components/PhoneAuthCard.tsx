'use client';

import { useState, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import UnifiedButton from '@/components/UnifiedButton';
import { initRecaptcha, sendSmsVerification, confirmSmsCode } from '@/lib/firebase';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';
import { PHONE_VALIDATION, AUTH_ERROR_MESSAGES, STORAGE_KEYS, AUTH_TIMING } from '@/constants/auth';
import { phoneFormatUtils } from '@/constants/phone-format';

const LAST_PHONE_KEY = STORAGE_KEYS.LAST_PHONE;

type AuthStep = 'phone' | 'code';

export default function PhoneAuthCard() {
  const router = useRouter();
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // State
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 마지막 로그인 전화번호 불러오기
  useEffect(() => {
    try {
      const lastPhone = localStorage.getItem(LAST_PHONE_KEY);
      if (lastPhone) {
        const formatted = phoneFormatUtils.formatAsTyping(lastPhone);
        setPhoneNumber(formatted);
      }
    } catch (error) {
      logger.error('마지막 전화번호 불러오기 실패:', error);
    }
  }, []);

  // reCAPTCHA 초기화 (컴포넌트 마운트 시 1회)
  useEffect(() => {
    // Strict Mode 대응: 이미 초기화되었으면 스킵
    if (recaptchaVerifierRef.current) {
      logger.debug('reCAPTCHA 이미 초기화됨 (Strict Mode skip)');
      return;
    }

    let isMounted = true; // Cleanup guard

    // Firebase 초기화를 기다림 (약간의 지연)
    const timer = setTimeout(() => {
      if (!isMounted) return; // Component unmounted during timeout

      try {
        recaptchaVerifierRef.current = initRecaptcha('recaptcha-container', 'invisible');
        logger.debug('reCAPTCHA 초기화 완료');
      } catch (error) {
        logger.error('reCAPTCHA 초기화 실패:', error);
        if (isMounted) {
          setError(AUTH_ERROR_MESSAGES.CAPTCHA_INIT_FAILED);
        }
      }
    }, AUTH_TIMING.RECAPTCHA_INIT_DELAY);

    // Cleanup: 모든 edge case 처리
    return () => {
      isMounted = false;
      clearTimeout(timer);

      // RecaptchaVerifier cleanup with error handling
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          logger.debug('reCAPTCHA cleanup 완료');
        } catch (error) {
          // Cleanup 실패는 로그만 (non-blocking)
          logger.warn('reCAPTCHA cleanup 실패 (무시됨):', error);
        } finally {
          recaptchaVerifierRef.current = null;
        }
      }
    };
  }, []);

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = phoneFormatUtils.formatAsTyping(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  // 인증 코드 입력 핸들러
  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
    setVerificationCode(numbers);
    setError('');
  };

  // Enter 키 핸들러
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      if (step === 'phone') {
        const numbers = phoneNumber.replace(/-/g, '');
        if (numbers.length === 11) {
          handleSendSms();
        }
      } else {
        if (verificationCode.length === 6) {
          handleVerifyCode();
        }
      }
    }
  };

  // 붙여넣기 핸들러
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numbers = pastedText.replace(/[^\d]/g, '');

    if (step === 'phone' && numbers.length > 0) {
      const formatted = phoneFormatUtils.formatAsTyping(numbers);
      setPhoneNumber(formatted);
    } else if (step === 'code' && numbers.length > 0) {
      setVerificationCode(numbers.slice(0, 6));
    }
  };

  // SMS 전송
  const handleSendSms = async () => {
    const cleanNumber = phoneNumber.replace(/-/g, '');

    if (cleanNumber.length !== PHONE_VALIDATION.PHONE_LENGTH) {
      setError(AUTH_ERROR_MESSAGES.PHONE_LENGTH_REQUIRED);
      return;
    }

    if (!recaptchaVerifierRef.current) {
      setError(AUTH_ERROR_MESSAGES.CAPTCHA_INIT_FAILED);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const confirmationResult = await sendSmsVerification(
        cleanNumber,
        recaptchaVerifierRef.current
      );
      confirmationResultRef.current = confirmationResult;

      // SMS 전송 성공 → 인증 코드 입력 단계로 이동
      setStep('code');
      logger.info('SMS 전송 성공');
    } catch (error: any) {
      logger.error('SMS 전송 실패:', error);
      setError(error.message || AUTH_ERROR_MESSAGES.SMS_SEND_FAILED);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    if (verificationCode.length !== PHONE_VALIDATION.VERIFICATION_CODE_LENGTH) {
      setError(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
      return;
    }

    if (!confirmationResultRef.current) {
      setError(AUTH_ERROR_MESSAGES.AUTH_SESSION_EXPIRED);
      setStep('phone');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userCredential = await confirmSmsCode(
        confirmationResultRef.current,
        verificationCode
      );

      logger.info('Firebase 로그인 성공', { uid: userCredential.user.uid });

      // 마지막 로그인 전화번호 저장
      try {
        const cleanNumber = phoneNumber.replace(/-/g, '');
        localStorage.setItem(LAST_PHONE_KEY, cleanNumber);
      } catch (error) {
        logger.error('전화번호 저장 실패:', error);
      }

      // Firestore에서 participant 조회
      // 1순위: firebaseUid로 조회 (이미 연결된 계정)
      // 2순위: 전화번호로 조회 후 firebaseUid 연결 (첫 로그인)
      const { getParticipantByFirebaseUid, getParticipantByPhoneNumber, linkFirebaseUid } = await import('@/lib/firebase');

      let participant = await getParticipantByFirebaseUid(userCredential.user.uid);

      if (!participant) {
        // firebaseUid가 없는 경우 → 전화번호로 조회
        const cleanNumber = phoneNumber.replace(/-/g, '');
        participant = await getParticipantByPhoneNumber(cleanNumber);

        if (participant) {
          // Firebase UID 연결 또는 업데이트
          // Firebase Auth는 동일 전화번호로 새 계정 생성 시 자동으로 기존 계정 재사용
          // 따라서 항상 현재 Firebase UID로 업데이트 (안전함)
          if (participant.firebaseUid !== userCredential.user.uid) {
            await linkFirebaseUid(participant.id, userCredential.user.uid);
            logger.info('Firebase UID 연결/업데이트 완료', {
              participantId: participant.id,
              oldFirebaseUid: participant.firebaseUid || 'none',
              newFirebaseUid: userCredential.user.uid,
            });
          }
        }
      }

      if (!participant) {
        setError(AUTH_ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
        setIsSubmitting(false);
        return;
      }

      logger.info('참가자 조회 성공', { participantId: participant.id });

      // 채팅 페이지로 이동 (Firebase Auth가 자동으로 세션 관리)
      router.replace(appRoutes.chat(participant.cohortId));
    } catch (error: any) {
      logger.error('인증 코드 확인 실패:', error);
      setError(error.message || AUTH_ERROR_MESSAGES.AUTH_FAILED);

      // 보안: 인증 실패 시 confirmationResult 초기화 (brute force 방지)
      confirmationResultRef.current = null;
      setVerificationCode(''); // 입력 필드도 초기화
    } finally {
      setIsSubmitting(false);
    }
  };

  // 다시 시작
  const handleReset = () => {
    setStep('phone');
    setVerificationCode('');
    setError('');
    confirmationResultRef.current = null;
  };

  // 완료 여부 체크
  const isPhoneComplete = phoneNumber.replace(/-/g, '').length === PHONE_VALIDATION.PHONE_LENGTH;
  const isCodeComplete = verificationCode.length === PHONE_VALIDATION.VERIFICATION_CODE_LENGTH;

  return (
    <>
      {/* reCAPTCHA 컨테이너 (invisible) */}
      <div id="recaptcha-container" />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">필립앤소피</CardTitle>
          <CardDescription>
            {step === 'phone'
              ? '등록된 휴대폰 번호를 입력해주세요.'
              : '인증 코드를 입력해주세요.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {step === 'phone' ? (
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="010-1234-5678"
                value={phoneNumber}
                maxLength={13}
                className={`text-center text-lg ${error ? 'border-destructive' : ''}`}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                autoFocus
                disabled={isSubmitting}
              />
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={verificationCode}
                  maxLength={6}
                  className={`text-center text-lg tracking-widest ${
                    error ? 'border-destructive' : ''
                  }`}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  autoFocus
                  disabled={isSubmitting}
                />
                <p className="text-center text-sm text-muted-foreground">
                  {phoneNumber}로 전송된 인증 코드를 입력해주세요.
                </p>
              </div>
            )}

            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {step === 'phone' ? (
            <UnifiedButton
              onClick={handleSendSms}
              disabled={!isPhoneComplete}
              loading={isSubmitting}
              loadingText="전송 중..."
              fullWidth
            >
              인증 코드 받기
            </UnifiedButton>
          ) : (
            <>
              <UnifiedButton
                onClick={handleVerifyCode}
                disabled={!isCodeComplete}
                loading={isSubmitting}
                loadingText="확인 중..."
                fullWidth
              >
                확인
              </UnifiedButton>
              <button
                type="button"
                onClick={handleReset}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={isSubmitting}
              >
                다시 시작
              </button>
            </>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
