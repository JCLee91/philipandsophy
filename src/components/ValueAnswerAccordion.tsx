'use client';

import Image from 'next/image';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ValueAnswerAccordionProps {
    participantId: string;
    participantName: string;
    profileImage?: string;
    answer: string;
    isExpanded: boolean;
    onToggle: () => void;
    onProfileClick: () => void;
}

export default function ValueAnswerAccordion({
    participantName,
    profileImage,
    answer,
    isExpanded,
    onToggle,
    onProfileClick,
}: ValueAnswerAccordionProps) {
    const previewLength = 60;
    const truncatedAnswer = answer.length > previewLength
        ? answer.slice(0, previewLength) + '...'
        : answer;

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Header - Always visible */}
            <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className="relative size-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                        src={profileImage || '/image/default-profile.svg'}
                        alt={participantName}
                        fill
                        className="object-cover"
                        sizes="40px"
                    />
                </div>

                {/* Name and Preview */}
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex-1 text-left min-w-0"
                >
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                        {participantName}
                    </p>
                    {!isExpanded && (
                        <p className="text-sm text-gray-600">
                            {truncatedAnswer}
                        </p>
                    )}
                </button>

                {/* Toggle Button */}
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    aria-label={isExpanded ? '답변 접기' : '답변 펼치기'}
                >
                    <motion.div
                        initial={false}
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="size-5" />
                    </motion.div>
                </button>

                {/* Profile Button */}
                <button
                    type="button"
                    onClick={onProfileClick}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    aria-label={`${participantName}님의 프로필 보기`}
                >
                    <ChevronRight className="size-5" />
                </button>
            </div>

            {/* Expandable Content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                        <div className="px-4 pb-4 pt-0">
                            <div className="pl-[52px] pr-[48px]">
                                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {answer}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
