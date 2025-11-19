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
}: ReviewPreviewCardProps) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-[12px] border-b-[2px] border-solid border-amber-200 cursor-pointer transition-all active:scale-[0.98]"
        >
            {/* 프로필 이미지 + 이름 (세로 정렬) */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-100 bg-white">
                    <Image
                        src={getResizedImageUrl(profileImage) || profileImage || '/image/default-profile.svg'}
                        alt={participantName}
                        fill
                        className="object-cover"
                        sizes="40px"
                    />
                </div>
                <p className="text-[11px] font-bold text-[#8f98a3] text-center line-clamp-1 w-12">
                    {participantName}
                </p>
            </div>

            {/* 책 표지 + 책 이름 */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {bookCoverUrl && (
                    <div className="relative w-[40px] h-[56px] bg-white rounded-[4px] overflow-hidden shadow-sm border border-gray-100">
                        <Image
                            src={getResizedImageUrl(bookCoverUrl) || bookCoverUrl}
                            alt={bookTitle}
                            fill
                            className="object-cover"
                            sizes="40px"
                        />
                    </div>
                )}
                <div className="flex flex-col justify-center">
                    <p className="text-[14px] font-medium text-[#31363e] line-clamp-1 max-w-[120px]">
                        {bookTitle}
                    </p>
                </div>
            </div>

            {/* 감상평 */}
            <div className="flex-1 min-w-0 flex items-center">
                <p className="text-[14px] text-[#575e68] line-clamp-1 leading-[1.4]">
                    {review}
                </p>
            </div>
        </div>
    );
}
