'use client';

import React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
    useApplicationStore,
    QuestionStep,
    ProgressBar,
    NEW_MEMBER_TOTAL_STEPS,
    EXISTING_MEMBER_TOTAL_STEPS,
    fadeIn,
} from '@/features/application';

export default function ApplicationPage() {
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

    const currentQuestion = getCurrentQuestion();
    const historyLength = getHistoryLength();

    // 멤버십 상태에 따라 총 스텝 수 결정
    const membershipStatus = answers['membership_status'] as string | undefined;
    const totalSteps = membershipStatus === 'existing'
        ? EXISTING_MEMBER_TOTAL_STEPS
        : NEW_MEMBER_TOTAL_STEPS;

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
