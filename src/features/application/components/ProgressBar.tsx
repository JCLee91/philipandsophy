'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';

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
        <div className="application-progress">
            {/* 왼쪽: 뒤로가기 버튼 */}
            <button
                type="button"
                onClick={onBack}
                disabled={!canGoBack}
                aria-label="이전 단계로"
                className="application-progress-back"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 중앙: 프로그레스바 */}
            <div className="application-progress-bar">
                <div
                    className="application-progress-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>

            {/* 오른쪽: 대칭을 위한 빈 공간 */}
            <div className="application-progress-spacer" aria-hidden="true" />
        </div>
    );
}
