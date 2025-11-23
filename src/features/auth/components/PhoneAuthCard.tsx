'use client';

import { useState, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
import { getAuthErrorMessage } from '@/lib/firebase/error-mapping';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';
import { PHONE_VALIDATION, AUTH_ERROR_MESSAGES, STORAGE_KEYS } from '@/constants/auth';
import { phoneFormatUtils } from '@/constants/phone-format';
import { Loader2 } from 'lucide-react';

const LAST_PHONE_KEY = STORAGE_KEYS.LAST_PHONE;

type AuthStep = 'phone' | 'code' | 'success';

export default function PhoneAuthCard() {
  const router = useRouter();
  const { participantStatus, retryParticipantFetch } = useAuth();
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const participantStatusRef = useRef(participantStatus);

  // State
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // ✅ participantStatus를 ref에 동기화
  useEffect(() => {
    participantStatusRef.current = participantStatus;
  }, [participantStatus]);

  // 마지막 로그인 전화번호 불러오기
  useEffect(() => {
    try {
      const lastPhone = localStorage.getItem(LAST_PHONE_KEY);
      if (lastPhone) {
        const formatted = phoneFormatUtils.formatAsTyping(lastPhone);
        setPhoneNumber(formatted);
      }
    } catch (error) {

    }
  }, []);

  // ✅ reCAPTCHA 초기화 (컴포넌트 마운트 시 1회, 지연 제거)
  useEffect(() => {
    // Strict Mode 대응: 이미 초기화되었으면 스킵
    if (recaptchaVerifierRef.current) {

      return;
    }

    let isMounted = true; // Cleanup guard

    // ✅ Firebase는 이미 초기화되어 있으므로 지연 없이 즉시 초기화
    try {
      recaptchaVerifierRef.current = initRecaptcha('recaptcha-container', 'invisible');

    } catch (error) {

      if (isMounted) {
        setError(AUTH_ERROR_MESSAGES.CAPTCHA_INIT_FAILED);
      }
    }

    // Cleanup: 모든 edge case 처리
    return () => {
      isMounted = false;

      // RecaptchaVerifier cleanup with error handling
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();

        } catch (error) {
          // Cleanup 실패는 로그만 (non-blocking)

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

    } catch (error: any) {

      setError(getAuthErrorMessage(error));
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
      const cleanNumber = phoneNumber.replace(/-/g, '');
      // ✅ Firebase 공식 패턴: confirmationResult.confirm() 호출
      // 성공 시 Firebase가 자동으로 onAuthStateChanged 트리거
      const userCredential = await confirmSmsCode(
        confirmationResultRef.current,
        verificationCode
      );

      // 마지막 로그인 전화번호 저장
      try {
        localStorage.setItem(LAST_PHONE_KEY, cleanNumber);
      } catch (error) {
        // localStorage 에러는 무시
      }

      // ✅ Firebase UID 연결 (필요시)
      const { getParticipantByFirebaseUid, getParticipantByPhoneNumber, linkFirebaseUid, unlinkFirebaseUid } = await import('@/lib/firebase');
      const currentUid = userCredential.user.uid;

      let participantByUid = await getParticipantByFirebaseUid(currentUid);
      const participantByPhone = cleanNumber ? await getParticipantByPhoneNumber(cleanNumber) : null;

      if (participantByPhone) {
        const shouldSwitchCohort = !participantByUid || participantByUid.id !== participantByPhone.id;
        const phoneMissingUid = participantByPhone.firebaseUid !== currentUid;

        if (shouldSwitchCohort || phoneMissingUid) {
          try {
            // ✅ FIX: 순서 변경 - 새 문서에 link 먼저, 성공 시에만 이전 문서 unlink
            // 이렇게 하면 link 실패 시 이전 UID는 보존됨 (롤백 불필요)
            await linkFirebaseUid(participantByPhone.id, currentUid);

            // 새 문서 link 성공 → 이전 문서 unlink
            if (shouldSwitchCohort && participantByUid && participantByUid.id !== participantByPhone.id) {
              await unlinkFirebaseUid(participantByUid.id);
            }

            participantByUid = {
              ...participantByPhone,
              firebaseUid: currentUid,
            };
          } catch (error) {
            logger.error('Failed to link Firebase UID', error);
            // link 실패 시: participantByUid는 기존 값 유지 (롤백 불필요)
            throw error; // 상위 catch로 전달
          }
        }
      }

      const participant = participantByUid ?? participantByPhone;

      if (!participant) {
        setError(AUTH_ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
        setIsSubmitting(false);
        return;
      }

      // ✅ 인증 성공! Success step으로 이동하여 시각적 피드백 제공
      // 상위 컴포넌트(/app/page.tsx)가 리다이렉트할 때까지 로딩 상태 유지
      setStep('success');

    } catch (error: any) {
      setError(getAuthErrorMessage(error));
      confirmationResultRef.current = null;
      setVerificationCode('');
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

  // Participant 재시도 핸들러
  const handleRetryParticipant = async () => {
    setIsRetrying(true);
    try {
      await retryParticipantFetch();
    } catch (error) {

    } finally {
      setIsRetrying(false);
    }
  };

  // 완료 여부 체크
  const isPhoneComplete = phoneNumber.replace(/-/g, '').length === PHONE_VALIDATION.PHONE_LENGTH;
  const isCodeComplete = verificationCode.length === PHONE_VALIDATION.VERIFICATION_CODE_LENGTH;

  // Participant 조회 실패 상태
  const showParticipantError = participantStatus === 'missing' || participantStatus === 'error';

  return (
    <div className="w-full max-w-md flex flex-col items-stretch gap-4">
      {/* reCAPTCHA 컨테이너 (invisible) */}
      <div id="recaptcha-container" />

      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">필립앤소피</CardTitle>
          <CardDescription>
            {step === 'phone'
              ? '등록된 휴대폰 번호를 입력해주세요.'
              : step === 'code'
              ? '인증 코드를 입력해주세요.'
              : '환영합니다!'}
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
            ) : step === 'code' ? (
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
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-center font-medium text-lg">
                  인증 완료! 입장 중입니다...
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
          ) : step === 'code' ? (
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
          ) : null}
        </CardFooter>
      </Card>

      {/* Participant 조회 실패 시 재시도 버튼 */}
      {showParticipantError && (
        <button
          type="button"
          onClick={handleRetryParticipant}
          disabled={isRetrying}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isRetrying ? '로그인 중...' : '다시 로그인하기'}
        </button>
      )}
    </div>
  );
}
