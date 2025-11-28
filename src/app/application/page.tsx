'use client';

import React from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import {
    useApplicationStore,
    QuestionStep,
    ProgressBar,
    NEW_MEMBER_TOTAL_STEPS,
    EXISTING_MEMBER_TOTAL_STEPS,
} from '@/features/application';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">제출이 완료되었습니다!</h1>
                    <p className="text-gray-600 mb-8">참여해 주셔서 감사합니다.</p>
                    <Button onClick={resetForm} variant="outline">처음으로 돌아가기</Button>
                </div>
            </div>
        );
    }

    // currentQuestion이 없는 경우 (에러 상태)
    if (!currentQuestion) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">오류가 발생했습니다</h1>
                    <Button onClick={resetForm} variant="outline">처음으로 돌아가기</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {/* 상단 로고 심볼 */}
            <header className="fixed top-6 left-0 w-full flex justify-center z-40 pointer-events-none">
                <div className="relative w-48 h-24">
                    <Image 
                        src="/image/pns_logo_symbol.png" 
                        alt="Logo" 
                        fill 
                        className="object-contain"
                        priority
                    />
                </div>
            </header>

            <ProgressBar 
                currentStep={historyLength} 
                totalSteps={totalSteps} 
                onBack={prevStep}
                canGoBack={canGoBack()}
            />

            <main className="flex-1 flex flex-col relative overflow-hidden justify-center">
                <AnimatePresence mode="wait">
                    <QuestionStep key={currentQuestion.id} question={currentQuestion} />
                </AnimatePresence>
            </main>

            <footer className="fixed bottom-8 w-full flex justify-center z-40 pointer-events-none">
                <div className="relative w-52 h-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                    <Image 
                        src="/image/pns_logo_text_white.png" 
                        alt="Philip & Sophy" 
                        fill 
                        className="object-contain"
                        priority
                    />
                </div>
            </footer>
        </div>
    );
}
