'use client';

import { usePathname } from 'next/navigation';
import TopBar from '@/components/TopBar';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import { useSubmissionCommon } from '@/hooks/use-submission-common';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

import { Step1Content } from './step1/page';
import { Step2Content } from './step2/page';
import { Step3Content } from './step3/page';

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '100%' : '-30%',
        opacity: 0,
        zIndex: 1, // Entering content on top
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', // Shadow for depth
    }),
    center: {
        x: '0%',
        opacity: 1,
        zIndex: 1,
        boxShadow: 'none',
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '100%' : '-30%',
        opacity: 0.8,
        zIndex: 0,
    }),
};

export default function SubmissionLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { handleBackToChat, handleBack } = useSubmissionCommon();

    // Determine current step based on pathname
    let currentStep: 1 | 2 | 3 = 1;
    if (pathname.includes('/submit/step2')) currentStep = 2;
    else if (pathname.includes('/submit/step3')) currentStep = 3;

    // Direction logic (Synchronous to avoid flicker)
    const prevStepRef = useRef(currentStep);
    const directionRef = useRef(0);

    if (currentStep !== prevStepRef.current) {
        directionRef.current = currentStep > prevStepRef.current ? 1 : -1;
        prevStepRef.current = currentStep;
    }

    const direction = directionRef.current;

    const handleBackNavigation = () => {
        if (currentStep === 1) {
            handleBackToChat();
        } else {
            handleBack();
        }
    };

    const steps = {
        1: <Step1Content />,
        2: <Step2Content />,
        3: <Step3Content />,
    };

    return (
        <div className="app-shell flex flex-col h-full bg-background overflow-hidden relative">
            {/* Persistent Header */}
            <div className="z-50 w-full bg-background/95 backdrop-blur-xs relative border-b border-border/40">
                <TopBar
                    onBack={handleBackNavigation}
                    title="독서 인증하기"
                    align="center"
                    position="relative"
                    className="shadow-none border-b-0"
                />
                <div className="w-full absolute bottom-0 left-0">
                    <ProgressIndicator currentStep={currentStep} />
                </div>
            </div>

            {/* Animated Content */}
            <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-50/50">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                        className="absolute inset-0 w-full h-full overflow-y-auto bg-background"
                    >
                        {steps[currentStep]}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
