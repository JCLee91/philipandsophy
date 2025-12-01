'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import VideoIntro from './VideoIntro';
import InfoStep from './InfoStep';
import { ONBOARDING_STEPS, ONBOARDING_VIDEO_SRC } from '../constants';
import { LANDING_CONSTANTS } from '@/constants/landing';

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<'video' | number>('video');
  const [isExiting, setIsExiting] = useState(false);

  // 마지막 스텝에서만 설문 페이지 미리 로드
  useEffect(() => {
    if (step === ONBOARDING_STEPS.length) {
      router.prefetch('/application');
    }
  }, [router, step]);

  const handleVideoComplete = () => {
    setStep(1);
  };

  const handleNextStep = () => {
    if (typeof step !== 'number') return;

    if (step < ONBOARDING_STEPS.length) {
      setStep(step + 1);
    } else {
      // 마지막 단계에서 설문폼으로 이동
      setIsExiting(true);
      
      // 페이드 아웃 애니메이션 시간(500ms)만큼 대기 후 이동
      setTimeout(() => {
        router.push('/application');
      }, 500);
    }
  };

  return (
    <motion.div 
      className="relative h-screen w-full overflow-hidden bg-black text-white"
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence mode="wait">
        {step === 'video' && (
          <VideoIntro
            key="video"
            src={ONBOARDING_VIDEO_SRC}
            onComplete={handleVideoComplete}
          />
        )}

        {typeof step === 'number' && (
          <InfoStep
            key={`step-${step}`}
            {...ONBOARDING_STEPS[step - 1]}
            onNext={handleNextStep}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
