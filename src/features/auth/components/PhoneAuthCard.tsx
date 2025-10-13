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

const LAST_PHONE_KEY = 'pns-last-phone';

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
        const formatted = formatPhoneNumber(lastPhone);
        setPhoneNumber(formatted);
      }
    } catch (error) {
      logger.error('마지막 전화번호 불러오기 실패:', error);
    }
  }, []);

  // reCAPTCHA 초기화 (컴포넌트 마운트 시 1회)
  useEffect(() => {
    try {
      recaptchaVerifierRef.current = initRecaptcha('recaptcha-container', 'invisible');
      logger.debug('reCAPTCHA 초기화 완료');
    } catch (error) {
      logger.error('reCAPTCHA 초기화 실패:', error);
      setError('보안 인증 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
    }

    // Cleanup
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // 전화번호 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');

    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
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
      const formatted = formatPhoneNumber(numbers);
      setPhoneNumber(formatted);
    } else if (step === 'code' && numbers.length > 0) {
      setVerificationCode(numbers.slice(0, 6));
    }
  };

  // SMS 전송
  const handleSendSms = async () => {
    const cleanNumber = phoneNumber.replace(/-/g, '');

    if (cleanNumber.length !== 11) {
      setError('11자리 휴대폰 번호를 입력해주세요.');
      return;
    }

    if (!recaptchaVerifierRef.current) {
      setError('보안 인증이 준비되지 않았습니다. 페이지를 새로고침해주세요.');
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
      setError(error.message || 'SMS 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.');
      return;
    }

    if (!confirmationResultRef.current) {
      setError('인증 세션이 만료되었습니다. 다시 시작해주세요.');
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
      // 2순위: 전화번호로 조회 후 firebaseUid 자동 연결 (첫 로그인)
      const { getParticipantByFirebaseUid, getParticipantByPhoneNumber, linkFirebaseUid } = await import('@/lib/firebase');

      let participant = await getParticipantByFirebaseUid(userCredential.user.uid);

      if (!participant) {
        // firebaseUid가 없는 경우 → 전화번호로 조회 후 자동 연결
        const cleanNumber = phoneNumber.replace(/-/g, '');
        participant = await getParticipantByPhoneNumber(cleanNumber);

        if (participant) {
          // Firebase UID 자동 연결 (첫 로그인 시)
          await linkFirebaseUid(participant.id, userCredential.user.uid);
          logger.info('Firebase UID 자동 연결 완료', {
            participantId: participant.id,
            firebaseUid: userCredential.user.uid,
          });
        }
      }

      if (!participant) {
        setError('등록되지 않은 번호입니다. 다시 확인해주세요.');
        setIsSubmitting(false);
        return;
      }

      logger.info('참가자 조회 성공', { participantId: participant.id });

      // 채팅 페이지로 이동
      router.replace(appRoutes.chat(participant.cohortId));
    } catch (error: any) {
      logger.error('인증 코드 확인 실패:', error);
      setError(error.message || '인증에 실패했습니다. 다시 시도해주세요.');
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
  const isPhoneComplete = phoneNumber.replace(/-/g, '').length === 11;
  const isCodeComplete = verificationCode.length === 6;

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
