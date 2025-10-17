'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { initRecaptcha, sendSmsVerification, confirmSmsCode } from '@/lib/firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { phoneFormatUtils } from '@/constants/phone-format';

type AuthStep = 'phone' | 'code';

export default function DataCenterLoginPage() {
  const router = useRouter();
  const { user, participant, isAdministrator, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인되어 있고 participant가 있으면 대시보드로 리다이렉트
  useEffect(() => {
    if (!authLoading && user && participant && isAdministrator) {
      router.replace('/datacntr');
    }
  }, [authLoading, user, participant, isAdministrator, router]);

  // reCAPTCHA 초기화
  useEffect(() => {
    if (recaptchaVerifierRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        recaptchaVerifierRef.current = initRecaptcha('recaptcha-container', 'invisible');
        logger.debug('reCAPTCHA 초기화 완료');
      } catch (error) {
        logger.error('reCAPTCHA 초기화 실패:', error);
        setError('인증 시스템 초기화에 실패했습니다.');
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (error) {
          logger.warn('reCAPTCHA cleanup 실패:', error);
        } finally {
          recaptchaVerifierRef.current = null;
        }
      }
    };
  }, []);

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = phoneFormatUtils.formatAsTyping(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  // 인증코드 입력 핸들러
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    setError('');
  };

  // 전화번호 제출 (SMS 발송)
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!recaptchaVerifierRef.current) {
      setError('인증 시스템이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const confirmationResult = await sendSmsVerification(
        phoneNumber,
        recaptchaVerifierRef.current
      );
      confirmationResultRef.current = confirmationResult;

      toast({
        title: '인증번호 발송',
        description: '입력하신 번호로 인증번호를 발송했습니다.',
      });

      setStep('code');
    } catch (error: any) {
      logger.error('SMS 발송 실패:', error);
      setError(error.message || '인증번호 발송에 실패했습니다.');
      toast({
        title: '발송 실패',
        description: error.message || '인증번호 발송에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증코드 제출
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!confirmationResultRef.current) {
      setError('인증 정보가 없습니다. 처음부터 다시 시도해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmSmsCode(confirmationResultRef.current, verificationCode);
      logger.info('로그인 성공');

      toast({
        title: '로그인 성공',
        description: 'Data Center에 오신 것을 환영합니다.',
      });

      router.push('/datacntr');
    } catch (error: any) {
      logger.error('인증 실패:', error);
      setError(error.message || '인증에 실패했습니다.');
      toast({
        title: '인증 실패',
        description: error.message || '인증번호가 올바르지 않습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 다시 시도
  const handleRetry = () => {
    setStep('phone');
    setVerificationCode('');
    setError('');
    confirmationResultRef.current = null;
  };

  // 인증 확인 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 이미 로그인되어 있고 participant가 있으면 null 반환 (리다이렉트됨)
  // participant 없이 user만 있는 경우는 AuthContext에서 자동 로그아웃 처리됨
  if (user && participant) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Data Center</h1>
          <p className="text-gray-600">필립앤소피 데이터 분석 센터</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              {/* 전화번호 입력 */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  전화번호
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="010-1234-5678"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  관리자로 등록된 전화번호만 접근 가능합니다
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* 인증번호 발송 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  '인증번호 발송'
                )}
              </button>

              {/* reCAPTCHA 컨테이너 */}
              <div id="recaptcha-container"></div>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              {/* 인증번호 입력 */}
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
                  인증번호
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="123456"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {phoneNumber}로 발송된 6자리 인증번호를 입력하세요
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </button>

              {/* 다시 시도 버튼 */}
              <button
                type="button"
                onClick={handleRetry}
                className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                다시 시도
              </button>
            </form>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            관리자 전용 페이지입니다.
            <br />
            등록된 관리자만 접근 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
