import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';

interface ReviewPreviewCardProps {
    participantId: string;
    participantName: string;
    profileImage?: string;
    bookCoverUrl?: string;
    bookTitle: string;
    bookAuthor?: string;
    review: string;
    maxLines?: number;
    onClick: () => void;
    onProfileClick?: () => void;
    isMe?: boolean;
}

export default function ReviewPreviewCard({
    participantId,
    participantName,
    profileImage,
    bookCoverUrl,
    bookTitle,
    bookAuthor,
    review,
    onClick,
    onProfileClick,
    isMe = false,
}: ReviewPreviewCardProps) {
    return (
        <div
            className={`flex items-start px-4 py-3 rounded-[12px] border-b-2 border-solid transition-all ${isMe
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-amber-50 border-amber-200'
                }`}
        >
            {/* 프로필 이미지 + 이름 (세로 정렬) */}
            <div
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group mr-3 mt-1"
                onClick={(e) => {
                    if (onProfileClick) {
                        e.stopPropagation();
                        onProfileClick();
                    }
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

            {/* 본문 영역 (클릭 시 상세 이동 & 눌림 효과) */}
            <div 
                className="flex-1 flex flex-col justify-center min-h-[56px] cursor-pointer active:scale-[0.98] transition-transform"
                onClick={onClick}
            >
                <p className="text-[14px] font-bold text-[#31363e] line-clamp-1 mb-1">
                    {bookTitle}
                </p>
                <p className="text-[14px] text-[#575e68] line-clamp-1 leading-[1.4]">
                    {review}
                </p>
            </div>
        </div>
    );
}
