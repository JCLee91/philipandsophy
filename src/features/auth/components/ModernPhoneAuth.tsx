'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { phoneFormatUtils } from '@/constants/phone-format';
import { PHONE_VALIDATION } from '@/constants/auth';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import {
  initInvisibleRecaptcha,
  sendSmsWithTimeout,
  verifySmsWithTimeout,
  setupWebOTPAutoFill,
  retryWithBackoff
} from '@/lib/firebase/auth-enhanced';
import { getAuthErrorMessage } from '@/lib/firebase/error-mapping';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type AuthStep = 'phone' | 'verify' | 'success';
type LoadingState = 'idle' | 'sending' | 'verifying' | 'auto-verifying';

export default function ModernPhoneAuth() {
  const router = useRouter();
  const { participant, participantStatus } = useAuth();

  // State
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string>('');
  const [countdown, setCountdown] = useState(0);

  // Refs
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const otpCleanupRef = useRef<(() => void) | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Auto-redirect when logged in
  useEffect(() => {
    if (participantStatus === 'ready' && participant) {
      router.replace(appRoutes.chat(participant.cohortId));
    }
  }, [participantStatus, participant, router]);

  // Initialize reCAPTCHA
  useEffect(() => {
    recaptchaRef.current = initInvisibleRecaptcha();

    return () => {
      recaptchaRef.current?.clear();
    };
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus inputs
  useEffect(() => {
    if (step === 'phone') {
      phoneInputRef.current?.focus();
    } else if (step === 'verify') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  // Phone number formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = phoneFormatUtils.formatAsTyping(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  // Send SMS
  const sendSms = async () => {
    if (!recaptchaRef.current) {
      setError('보안 설정을 초기화하는 중입니다. 잠시만 기다려주세요.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/-/g, '');
    if (cleanPhone.length !== PHONE_VALIDATION.PHONE_LENGTH) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }

    setLoadingState('sending');
    setError('');

    try {
      // Send SMS with retry
      const result = await retryWithBackoff(
        () => sendSmsWithTimeout(phoneNumber, recaptchaRef.current!),
        2, // max 2 retries
        2000 // 2 second base delay
      );

      confirmationRef.current = result;

      // Move to verify step
      setStep('verify');
      setCountdown(60); // 60 second countdown for resend

      // Setup Web OTP auto-detection
      otpCleanupRef.current = setupWebOTPAutoFill((code) => {
        setVerificationCode(code);
        verifyCode(code);
      });

    } catch (error: any) {
      setError(getAuthErrorMessage(error));
      logger.error('SMS send error:', error);
    } finally {
      setLoadingState('idle');
    }
  };

  // Verify code
  const verifyCode = async (code?: string) => {
    const codeToVerify = code || verificationCode;

    if (codeToVerify.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }

    if (!confirmationRef.current) {
      setError('인증 정보가 만료되었습니다. 다시 시도해주세요.');
      setStep('phone');
      return;
    }

    setLoadingState(code ? 'auto-verifying' : 'verifying');
    setError('');

    try {
      await verifySmsWithTimeout(confirmationRef.current, codeToVerify);

      // Success animation
      setStep('success');

      // Clean up OTP listener
      otpCleanupRef.current?.();

      // Wait a moment for success animation
      setTimeout(() => {
        // Auth context will handle the redirect
      }, 1000);

    } catch (error: any) {
      setError(getAuthErrorMessage(error));
      setLoadingState('idle');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'phone') {
        sendSms();
      } else if (step === 'verify') {
        verifyCode();
      }
    }
  };

  // Resend SMS
  const resendSms = () => {
    setStep('phone');
    setVerificationCode('');
    setError('');
    otpCleanupRef.current?.();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" />

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold text-center">필립앤소피</h1>
          <p className="text-center text-blue-100 mt-1">
            {step === 'phone' ? '로그인' : step === 'verify' ? '인증번호 확인' : '환영합니다!'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  휴대폰 번호
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onKeyPress={handleKeyPress}
                  placeholder="010-1234-5678"
                  maxLength={13}
                  disabled={loadingState !== 'idle'}
                  className={cn(
                    "w-full px-4 py-3 text-lg rounded-lg border-2 transition-colors",
                    "focus:outline-none focus:border-blue-500",
                    error ? "border-red-300 bg-red-50" : "border-gray-200"
                  )}
                />
              </div>

              <button
                onClick={sendSms}
                disabled={loadingState !== 'idle' || phoneNumber.replace(/-/g, '').length !== 10}
                className={cn(
                  "w-full py-3 rounded-lg font-medium transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  loadingState !== 'idle' || phoneNumber.replace(/-/g, '').length !== 10
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:scale-98"
                )}
              >
                {loadingState === 'sending' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    인증번호 발송 중...
                  </span>
                ) : (
                  '인증번호 받기'
                )}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  인증번호 6자리
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');

                    // Auto-submit when 6 digits
                    if (value.length === 6) {
                      verifyCode(value);
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="123456"
                  maxLength={6}
                  disabled={loadingState !== 'idle'}
                  className={cn(
                    "w-full px-4 py-3 text-2xl text-center font-mono rounded-lg border-2 transition-colors tracking-widest",
                    "focus:outline-none focus:border-blue-500",
                    error ? "border-red-300 bg-red-50" : "border-gray-200"
                  )}
                />
              </div>

              {/* Auto-verifying indicator */}
              {loadingState === 'auto-verifying' && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">자동으로 인증 중...</span>
                </div>
              )}

              {/* Resend button */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={resendSms}
                  disabled={countdown > 0}
                  className={cn(
                    "font-medium transition-colors",
                    countdown > 0
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-blue-600 hover:text-blue-700"
                  )}
                >
                  {countdown > 0 ? `재발송 (${countdown}초)` : '인증번호 재발송'}
                </button>
                <span className="text-gray-500">{phoneNumber}</span>
              </div>

              <button
                onClick={() => verifyCode()}
                disabled={loadingState !== 'idle' || verificationCode.length !== 6}
                className={cn(
                  "w-full py-3 rounded-lg font-medium transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  loadingState !== 'idle' || verificationCode.length !== 6
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:scale-98"
                )}
              >
                {loadingState === 'verifying' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    인증 중...
                  </span>
                ) : (
                  '확인'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto animate-in zoom-in duration-300" />
              <div>
                <p className="text-lg font-medium">인증 완료!</p>
                <p className="text-gray-500 mt-1">잠시 후 이동합니다...</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Back to previous step */}
      {step === 'verify' && (
        <button
          onClick={() => {
            setStep('phone');
            setError('');
            otpCleanupRef.current?.();
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>전화번호 다시 입력</span>
        </button>
      )}
    </div>
  );
}