'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import OnboardingFlow from '@/features/onboarding/components/OnboardingFlow';
import { PrivacyPolicyModal } from '@/features/application/components/PrivacyPolicyModal';
import { formatPhoneNumber, isValidPhoneNumber } from '@/features/application/lib/validation';
import { getLandingConfig } from '@/lib/firebase/landing';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const errorAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Waitlist steps configuration
type WaitlistStep = 'intro' | 'info' | 'phone' | 'complete';

const TOTAL_STEPS = 3; // intro, info (name+gender), phone

export default function WaitlistPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Flow state
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<WaitlistStep>('intro');
  const [stepHistory, setStepHistory] = useState<WaitlistStep[]>(['intro']);

  // Config state (데이터센터 연동)
  const [cohortNumber, setCohortNumber] = useState<number>(6); // 기본값

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [phone, setPhone] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // UI state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 데이터센터 설정에서 모집 기수 가져오기
  React.useEffect(() => {
    getLandingConfig().then((config) => {
      setCohortNumber(config.cohortNumber);
    }).catch(() => {
      // 실패 시 기본값 유지
    });
  }, []);

  // Onboarding complete handler
  const handleOnboardingComplete = () => {
    setShowForm(true);
  };

  // Navigation helpers
  const canGoBack = stepHistory.length > 1;

  const goBack = () => {
    if (!canGoBack) return;
    const newHistory = [...stepHistory];
    newHistory.pop();
    const previousStep = newHistory[newHistory.length - 1];
    setStepHistory(newHistory);
    setCurrentStep(previousStep);
    setValidationError(null);
  };

  const goToStep = (step: WaitlistStep) => {
    setStepHistory([...stepHistory, step]);
    setCurrentStep(step);
    setValidationError(null);
  };

  // Form handlers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
    setValidationError(null);
  };

  const handleSubmit = async () => {
    // Validate
    if (!phone.trim()) {
      setValidationError('연락처를 입력해주세요.');
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setValidationError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    if (!privacyConsent) {
      setValidationError('개인정보처리방침에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getDb();
      const waitlistRef = collection(db, 'waitlist');

      // Check for duplicates
      const q = query(waitlistRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Already registered - still show success for UX
        goToStep('complete');
        return;
      }

      // 성별 한글 변환
      const genderMap: Record<string, string> = {
        male: '남성',
        female: '여성',
      };

      // Save to Firestore
      await addDoc(waitlistRef, {
        name: name.trim(),
        phone: phone.trim(),
        gender,
        agreed: true,
        createdAt: serverTimestamp(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        waitlistCohort: cohortNumber, // 데이터센터 모집 기수 연동
      });

      // Make 웹훅으로 전송
      const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;
      if (webhookUrl) {
        const webhookData = {
          이름: name.trim(),
          연락처: phone.trim(),
          성별: genderMap[gender] || '',
          회원유형: '웨이팅',
          웨이팅기수: `${cohortNumber}기`, // 데이터센터 모집 기수 연동
          신청일시: new Date().toISOString(),
        };

        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData),
          keepalive: true,
        }).catch((err) => {
          console.error('웹훅 전송 실패:', err);
        });
      }

      goToStep('complete');
    } catch (error) {
      console.error('Waitlist submission error:', error);
      toast({
        title: '신청 실패',
        description: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step validation and navigation
  const validateAndNext = () => {
    setValidationError(null);

    if (currentStep === 'intro') {
      goToStep('info');
      return;
    }

    if (currentStep === 'info') {
      if (!name.trim()) {
        setValidationError('성함을 입력해주세요.');
        return;
      }
      if (name.trim().length < 2) {
        setValidationError('성함은 2글자 이상 입력해주세요.');
        return;
      }
      if (!gender) {
        setValidationError('성별을 선택해주세요.');
        return;
      }
      goToStep('phone');
      return;
    }

    if (currentStep === 'phone') {
      handleSubmit();
    }
  };

  // Progress calculation
  const getStepIndex = (): number => {
    const stepOrder: WaitlistStep[] = ['intro', 'info', 'phone'];
    return stepOrder.indexOf(currentStep) + 1;
  };

  const progress = (getStepIndex() / TOTAL_STEPS) * 100;

  // Show onboarding first
  if (!showForm) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Complete screen
  if (currentStep === 'complete') {
    return (
      <div className="application-page">
        <div className="application-container">
          <motion.div
            className="application-content text-center"
            {...fadeInUp}
          >
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-white">
              알림 신청이 완료되었습니다!
            </h1>
            <p className="text-gray-400 mb-10 leading-relaxed">
              6기 모집이 시작되면<br />
              입력하신 번호로 가장 먼저 알려드리겠습니다.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="cta-button-white"
            >
              홈으로 돌아가기
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="application-page">
      <div className="application-container">
        {/* Header Logo */}
        <motion.header className="application-header" {...fadeInUp}>
          <div className="application-logo">
            <Image
              src="/image/pns_logo_symbol.png"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="application-content">
          <AnimatePresence mode="wait">
            {/* Step: Intro */}
            {currentStep === 'intro' && (
              <motion.div
                key="intro"
                className="question-step"
                {...fadeInUp}
              >
                <div className="question-header question-header-intro">
                  <h2 className="question-title question-title-intro">
                    안녕하세요,{'\n'}필립앤소피입니다.
                  </h2>
                  <p className="question-description text-left">
                    <span className="text-white font-semibold">12/22(월)</span>부터{'\n'}
                    6기 모집이 공식적으로 시작됩니다.{'\n'}
                    {'\n'}
                    성함과 연락처를 남겨주시면,{'\n'}
                    모집 시작일(12/22)에{'\n'}
                    최우선적으로 알려드리겠습니다.
                  </p>
                </div>
                <div className="question-action">
                  <button className="cta-button-white" onClick={validateAndNext}>
                    사전 알림 신청하기
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: Info (Name + Gender) */}
            {currentStep === 'info' && (
              <motion.div
                key="info"
                className="question-step"
                {...fadeInUp}
              >
                <div className="question-header">
                  <h2 className="question-title">
                    기본 정보를 알려주세요
                  </h2>
                </div>
                <div className="question-body">
                  <div className="question-input-wrap">
                    {/* 이름 입력 */}
                    <div className="composite-field">
                      <label className="composite-label">이름</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="홍길동"
                        className="form-input-dark"
                        autoFocus
                      />
                    </div>

                    {/* 성별 선택 */}
                    <div className="composite-field">
                      <label className="composite-label">성별</label>
                      <div className="composite-select-group">
                        <button
                          type="button"
                          onClick={() => {
                            setGender('male');
                            setValidationError(null);
                          }}
                          className={`composite-select-btn ${gender === 'male' ? 'selected' : ''}`}
                        >
                          남성
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGender('female');
                            setValidationError(null);
                          }}
                          className={`composite-select-btn ${gender === 'female' ? 'selected' : ''}`}
                        >
                          여성
                        </button>
                      </div>
                    </div>

                    <div className="question-submit">
                      {validationError && (
                        <motion.div className="question-error" {...errorAnimation}>
                          <AlertCircle className="w-4 h-4" />
                          <span>{validationError}</span>
                        </motion.div>
                      )}
                      <button
                        onClick={validateAndNext}
                        className="cta-button-white"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step: Phone + Privacy */}
            {currentStep === 'phone' && (
              <motion.div
                key="phone"
                className="question-step"
                {...fadeInUp}
              >
                <div className="question-header">
                  <h2 className="question-title">
                    연락처를 알려주세요
                  </h2>
                  <p className="question-description">
                    모집 시작 시 문자로 알림을 보내드립니다.
                  </p>
                </div>
                <div className="question-body">
                  <div className="question-input-wrap">
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="010-0000-0000"
                      className="form-input-dark"
                      maxLength={13}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && phone.trim()) {
                          validateAndNext();
                        }
                      }}
                    />
                    <div className="question-submit">
                      {validationError && (
                        <motion.div className="question-error" {...errorAnimation}>
                          <AlertCircle className="w-4 h-4" />
                          <span>{validationError}</span>
                        </motion.div>
                      )}

                      {/* Privacy consent */}
                      <div className="question-privacy">
                        <Checkbox
                          id="privacy-consent"
                          checked={privacyConsent}
                          onCheckedChange={(checked) => {
                            setPrivacyConsent(checked === true);
                            if (checked) setValidationError(null);
                          }}
                          className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
                        />
                        <label htmlFor="privacy-consent" className="question-privacy-label">
                          계속하시면{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPrivacyModalOpen(true);
                            }}
                            className="question-privacy-link"
                          >
                            개인정보처리방침
                          </button>
                          에 동의하게 됩니다.
                        </label>
                        <PrivacyPolicyModal
                          open={privacyModalOpen}
                          onOpenChange={setPrivacyModalOpen}
                        />
                      </div>

                      <button
                        onClick={validateAndNext}
                        disabled={!privacyConsent || isSubmitting}
                        className="cta-button-white"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                            처리 중...
                          </>
                        ) : (
                          '알림 신청 완료'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Progress Bar */}
        <div className="application-progress">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="이전 단계로"
            className="application-progress-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="application-progress-bar">
            <div
              className="application-progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="application-progress-spacer" aria-hidden="true" />
        </div>

        {/* Footer Logo */}
        <motion.footer className="application-footer" {...fadeInUp}>
          <div className="application-footer-logo">
            <Image
              src="/image/pns_logo_text_white.png"
              alt="Philip & Sophy"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
