'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import VideoIntro from './VideoIntro';
import InfoStep from './InfoStep';
import { ONBOARDING_STEPS, ONBOARDING_VIDEO_SRC } from '../constants';
import { logFunnelEvent } from '@/lib/firebase/funnel';

/**
 * 세션 ID 관리 (use-application.ts와 동일한 키 사용)
 */
const SESSION_STORAGE_KEY = 'pns_funnel_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

/**
 * 온보딩 단계별 퍼널 stepId 매핑
 */
const ONBOARDING_FUNNEL_MAP: Record<string, { stepId: string; stepIndex: number }> = {
  video: { stepId: 'onboarding_video', stepIndex: 0 },
  '1': { stepId: 'onboarding_step_1', stepIndex: 1 },
  '2': { stepId: 'onboarding_step_2', stepIndex: 2 },
  '3': { stepId: 'onboarding_step_3', stepIndex: 3 },
};

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'video' | number | 'done'>('video');
  const trackedStepsRef = useRef<Set<string>>(new Set());

  // 단계 진입 시 퍼널 이벤트 로깅
  useEffect(() => {
    const stepKey = String(step);
    const funnelInfo = ONBOARDING_FUNNEL_MAP[stepKey];

    // done 단계이거나 이미 로깅된 단계는 무시
    if (!funnelInfo || trackedStepsRef.current.has(funnelInfo.stepId)) return;

    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    // 퍼널 이벤트 로깅 (memberType은 아직 null - 회원 유형 선택 전)
    logFunnelEvent({
      sessionId,
      stepId: funnelInfo.stepId,
      stepIndex: funnelInfo.stepIndex,
      memberType: null,
    });

    trackedStepsRef.current.add(funnelInfo.stepId);
  }, [step]);

  const handleVideoComplete = () => {
    setStep(1);
  };

  const handleNextStep = () => {
    if (typeof step !== 'number') return;

    if (step < ONBOARDING_STEPS.length) {
      setStep(step + 1);
    } else {
      // 마지막 단계 - exit 애니메이션 트리거
      setStep('done');
    }
  };

  const handlePrevStep = () => {
    if (typeof step !== 'number' || step <= 1) return;
    setStep(step - 1);
  };

  const handleExitComplete = () => {
    if (step === 'done') {
      onComplete();
    }
  };

  return (
    <div className="application-page text-white">
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
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
            onPrev={handlePrevStep}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
