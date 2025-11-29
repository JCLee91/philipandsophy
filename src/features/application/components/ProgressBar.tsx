'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROGRESS_BAR } from '../constants/layout';

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
    onBack: () => void;
    canGoBack: boolean;
}

export function ProgressBar({ currentStep, totalSteps, onBack, canGoBack }: ProgressBarProps) {
    // Ensure we don't divide by zero
    const safeTotal = totalSteps > 0 ? totalSteps : 1;
    const progress = (currentStep / safeTotal) * 100;

    return (
        <div className={cn(
            "fixed left-0 w-full px-8 z-50 flex justify-center items-center pointer-events-none",
            PROGRESS_BAR.BOTTOM
        )}>
            <div className={cn(
                "flex items-center gap-3 w-full pointer-events-auto",
                PROGRESS_BAR.MAX_WIDTH
            )}>
                {/* 왼쪽: 뒤로가기 버튼 (항상 동일한 공간 차지) */}
                <button
                    type="button"
                    onClick={onBack}
                    disabled={!canGoBack}
                    aria-label="이전 단계로"
                    className={cn(
                        "w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all",
                        canGoBack
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            : 'bg-transparent text-transparent cursor-default'
                    )}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* 중앙: 프로그레스바 */}
                <div className={cn("flex-1 bg-zinc-800 rounded-full overflow-hidden", PROGRESS_BAR.HEIGHT)}>
                    <motion.div
                        className="h-full bg-white"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>

                {/* 오른쪽: 대칭을 위한 빈 공간 (버튼과 동일한 크기) */}
                <div className="w-8 h-8 flex-shrink-0" aria-hidden="true" />
            </div>
        </div>
    );
}
