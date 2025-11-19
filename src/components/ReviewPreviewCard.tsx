'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface ReviewPreviewCardProps {
    participantId: string;
    participantName: string;
    profileImage?: string;
    bookCoverUrl?: string;
    bookTitle: string;
    review: string;
    maxLines?: number;
    onReviewClick: () => void;
    onProfileClick: () => void;
}

export default function ReviewPreviewCard({
    participantName,
    profileImage,
    bookCoverUrl,
    bookTitle,
    review,
    maxLines = 3,
    onReviewClick,
    onProfileClick,
}: ReviewPreviewCardProps) {
    return (
        <div className="relative flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
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

            {/* Book Cover */}
            <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                {bookCoverUrl ? (
                    <Image
                        src={bookCoverUrl}
                        alt={bookTitle}
                        fill
                        className="object-cover"
                        sizes="48px"
                    />
                ) : (
                    <div className="size-full flex items-center justify-center text-xs text-gray-400">
                        📕
                    </div>
                )}
            </div>

            {/* Review Content */}
            <button
                type="button"
                onClick={onReviewClick}
                className="flex-1 text-left min-w-0"
            >
                <p className="text-xs font-medium text-gray-700 mb-1">
                    {participantName}의 감상평
                </p>
                <p
                    className="text-sm text-gray-900 leading-relaxed"
                    style={{
                        display: '-webkit-box',
                        WebkitLineClamp: maxLines,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {review}
                </p>
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
    );
}
