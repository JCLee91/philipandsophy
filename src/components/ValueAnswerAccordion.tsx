import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ValueAnswerAccordionProps {
    participantId: string;
    participantName: string;
    profileImage?: string;
    question: string;
    answer: string;
    isExpanded: boolean;
    onToggle: () => void;
    onProfileClick: () => void;
}

export default function ValueAnswerAccordion({
    participantName,
    profileImage,
    question,
    answer,
    isExpanded,
    onToggle,
    onProfileClick,
}: ValueAnswerAccordionProps) {
    return (
        <div className="py-2 last:pb-0">
            {/* 배경 박스 - 감상평 스타일과 통일 */}
            <div className="bg-gray-50 rounded-[12px] border-b-[2px] border-solid border-gray-300 px-4 py-3 transition-all">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center gap-3 text-left"
                >
                    {/* 프로필 이미지 + 이름 (세로 정렬) */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div
                            className="relative h-6 w-6 overflow-hidden rounded-full border border-gray-100 bg-white cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onProfileClick();
                            }}
                        >
                            <Image
                                src={getResizedImageUrl(profileImage) || profileImage || '/image/default-profile.svg'}
                                alt={participantName}
                                fill
                                className="object-cover"
                                sizes="24px"
                            />
                        </div>
                        <span
                            className="text-[11px] font-bold text-[#8f98a3] cursor-pointer hover:underline text-center line-clamp-1 w-12"
                            onClick={(e) => {
                                e.stopPropagation();
                                onProfileClick();
                            }}
                        >
                            {participantName}
                        </span>
                    </div>

                    {/* 답변 - 축소 시 한 줄, 확장 시 전체 (중복 없이) */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-[14px] leading-[1.4] text-[#31363e] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-1' : ''}`}>
                            {answer}
                        </p>
                    </div>

                    {/* 화살표 */}
                    <div className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                </button>

                {/* 확장 시 프로필북 가기 버튼 */}
                {isExpanded && (
                    <div className="mt-3 flex justify-end border-t border-gray-200 pt-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onProfileClick();
                            }}
                            className="text-[13px] font-medium text-[#8f98a3] hover:text-[#31363e] transition-colors flex items-center gap-1"
                        >
                            프로필북 보기 <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
