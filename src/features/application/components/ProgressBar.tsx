'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
        <div className="fixed bottom-[120px] left-0 w-full px-4 z-50 flex justify-center items-center pointer-events-none">
            <div className="flex items-center gap-3 max-w-[280px] w-full pointer-events-auto">
                {canGoBack && (
                    <button
                        onClick={onBack}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
                
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-white"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>
            </div>
        </div>
    );
}
