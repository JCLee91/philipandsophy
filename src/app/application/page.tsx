'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
    useApplicationStore,
    QuestionStep,
    ProgressBar,
    NEW_MEMBER_TOTAL_STEPS,
    EXISTING_MEMBER_TOTAL_STEPS,
    fadeIn,
} from '@/features/application';
import OnboardingFlow from '@/features/onboarding/components/OnboardingFlow';
import { getLandingConfig } from '@/lib/firebase/landing';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '@/types/landing';
import { Loader2 } from 'lucide-react';

export default function ApplicationPage() {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [config, setConfig] = useState<LandingConfig | null>(null);
    const [loading, setLoading] = useState(true);

    const {
        getCurrentQuestion,
        getHistoryLength,
        canGoBack,
        nextStep,
        prevStep,
        isComplete,
        resetForm,
        answers
    } = useApplicationStore();

    useEffect(() => {
        async function fetchConfig() {
            try {
                const data = await getLandingConfig();
                setConfig(data);

                // 설정 확인 후 잘못된 접근 리다이렉트 로직
                // 1. OPEN 상태이지만 외부 폼(EXTERNAL)을 써야 하는 경우 -> 외부 URL로 이동
                if (data.status === 'OPEN' && data.openFormType === 'EXTERNAL' && data.externalUrl) {
                    window.location.href = data.externalUrl;
                    return;
                }

                // 2. CLOSED 상태이지만 외부 대기 폼(EXTERNAL_WAITLIST)을 써야 하는 경우 -> 바로 이동할지, 온보딩 후 이동할지 정책 결정
                // (현재 기획: 온보딩 영상은 보고 나서 이동하도록 유지 -> 여기서는 리다이렉트 안 함)

                // 3. CLOSED 상태이고 대기 안 받음(NONE)인 경우 -> 홈으로 쫓아내기
                if (data.status === 'CLOSED' && data.closedFormType === 'NONE') {
                    router.replace('/');
                    return;
                }

            } catch (error) {
                console.error('Failed to fetch landing config', error);
                setConfig(DEFAULT_LANDING_CONFIG);
            } finally {
                setLoading(false);
            }
        }
        fetchConfig();
    }, [router]);

    const handleOnboardingComplete = () => {
        if (!config) return;

        // 온보딩 완료 후 동작 분기
        if (config.status === 'OPEN') {
            // 모집 중
            if (config.openFormType === 'INTERNAL') {
                setShowForm(true); // 자체 폼 표시
            } else if (config.openFormType === 'EXTERNAL') {
                window.location.href = config.externalUrl; // 외부 폼 이동 (혹시 위에서 안 걸러졌을 경우)
            }
        } else {
            // 마감 (CLOSED)
            if (config.closedFormType === 'EXTERNAL_WAITLIST' && config.externalUrl) {
                window.location.href = config.externalUrl; // 대기 폼 이동
            } else {
                router.replace('/'); // 대기 안 받으면 홈으로
            }
        }
    };

    const currentQuestion = getCurrentQuestion();
    const historyLength = getHistoryLength();

    // 멤버십 상태에 따라 총 스텝 수 결정
    const membershipStatus = answers['membership_status'] as string | undefined;
    const totalSteps = membershipStatus === 'existing'
        ? EXISTING_MEMBER_TOTAL_STEPS
        : NEW_MEMBER_TOTAL_STEPS;

    if (loading) {
        return (
            <div className="application-page flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    // 온보딩 미완료 시 온보딩 플로우 표시
    if (!showForm) {
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;
    }

    if (isComplete) {
        return (
            <div className="application-page">
                <div className="application-container">
                    <motion.div className="application-content text-center" {...fadeIn}>
                        <h1 className="text-2xl font-bold mb-4 text-white">제출이 완료되었습니다!</h1>
                        <p className="text-gray-400 mb-8">참여해 주셔서 감사합니다.</p>
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                window.location.href = '/';
                            }}
                            className="cta-button-white"
                        >
                            홈으로 돌아가기
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    // currentQuestion이 없는 경우 (에러 상태)
    if (!currentQuestion) {
        return (
            <div className="application-page">
                <div className="application-container">
                    <motion.div className="application-content text-center" {...fadeIn}>
                        <h1 className="text-xl font-bold mb-4 text-white">오류가 발생했습니다</h1>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="cta-button-white"
                        >
                            처음으로 돌아가기
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="application-page">
            <div className="application-container">
                {/* 상단 로고 */}
                <motion.header className="application-header" {...fadeIn}>
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

                {/* 메인 콘텐츠 */}
                <main className="application-content">
                    <AnimatePresence mode="wait">
                        <QuestionStep key={currentQuestion.id} question={currentQuestion} />
                    </AnimatePresence>
                </main>

                {/* 프로그레스바 - 하단 */}
                <ProgressBar
                    currentStep={historyLength}
                    totalSteps={totalSteps}
                    onBack={prevStep}
                    canGoBack={canGoBack()}
                />

                {/* 하단 로고 */}
                <motion.footer className="application-footer" {...fadeIn}>
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
