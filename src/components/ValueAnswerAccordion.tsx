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
    isMe?: boolean;
}

export default function ValueAnswerAccordion({
    participantName,
    profileImage,
    question,
    answer,
    isExpanded,
    onToggle,
    onProfileClick,
    isMe = false,
}: ValueAnswerAccordionProps) {
    return (
        <div className="py-0"> {/* py-2 제거하여 ReviewPreviewCard와 간격 맞춤 필요 시 상위에서 gap 조절 */}
            {/* 배경 박스 - 감상평 스타일과 통일 */}
            <div className={`flex flex-col rounded-[12px] border-b-[2px] border-solid px-4 py-3 transition-all ${isMe
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-300'
                }`}>
                <button
                    onClick={onToggle}
                    className="w-full flex items-start text-left"
                >
                    {/* 프로필 이미지 + 이름 (세로 정렬) - 클릭 영역 통합 */}
                    <div 
                        className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group mr-3 mt-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onProfileClick();
                        }}
                    >
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-100 bg-white">
                            <Image
                                src={getResizedImageUrl(profileImage) || profileImage || '/image/default-profile.svg'}
                                alt={participantName}
                                fill
                                className="object-cover"
                                sizes="40px"
                            />
                        </div>
                        <p className="text-[11px] font-bold text-[#8f98a3] group-hover:underline text-center line-clamp-1 w-12">
                            {participantName}
                        </p>
                    </div>

                    {/* 답변 + 화살표 컨테이너 */}
                    <div className="flex-1 flex items-center min-h-[56px]"> {/* 감상평 카드와 높이 맞춤 */}
                         {/* 답변 - 축소 시 한 줄, 확장 시 전체 (중복 없이) */}
                        <div className="flex-1 min-w-0 mr-2">
                            <p className={`text-[14px] leading-[1.4] text-[#31363e] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-1' : ''}`}>
                                {answer}
                            </p>
                        </div>

                        {/* 화살표 */}
                        <div className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
}
