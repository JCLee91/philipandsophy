'use client';

import { Suspense, useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import UnifiedButton from '@/components/UnifiedButton';
import Image from 'next/image';
import { ReadingSubmission, Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import ImageDialog from '@/components/ImageDialog';
import { getInitials, getFirstName } from '@/lib/utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Maximize2 } from 'lucide-react';

// ✅ Disable static generation
export const dynamic = 'force-dynamic';

interface ReviewData {
    submission: ReadingSubmission | null;
    participant: Participant;
}

function ReviewDetailContent({ params }: { params: { participantId: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { participant: currentUser } = useAuth();
    const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);

    // URL 디코딩 (한글 이름 처리)
    const participantId = decodeURIComponent(params.participantId);
    const submissionDate = searchParams.get('date');
    const cohortId = searchParams.get('cohort');

    // Fetch review data
    const { data, isLoading, error } = useQuery<ReviewData>({
        queryKey: ['review-detail', participantId, submissionDate],
        queryFn: async () => {
            if (!submissionDate || submissionDate === 'undefined') throw new Error('Missing date parameter');
            if (!participantId || participantId === 'undefined' || participantId === 'null') throw new Error('Missing participant ID');

            const db = getDb();

            // Fetch submission
            const submissionsRef = collection(db, 'reading_submissions');
            // Simplify query to use existing index (participantId + submissionDate)
            const q = query(
                submissionsRef,
                where('participantId', '==', participantId),
                where('submissionDate', '==', submissionDate)
            );
            const submissionSnapshot = await getDocs(q);

            let submission: ReadingSubmission | undefined;

            if (!submissionSnapshot.empty) {
                // Filter for approved status in memory
                const approvedSubmission = submissionSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as ReadingSubmission))
                    .find(sub => sub.status === 'approved');

                if (approvedSubmission) {
                    submission = approvedSubmission;
                }
            }

            // Fetch participant (always needed for empty state)
            const participantDoc = await getDoc(doc(db, 'participants', participantId));
            if (!participantDoc.exists()) {
                console.error(`Participant document not found for ID: ${participantId}`);
                throw new Error('Participant not found');
            }

            const participant = {
                id: participantDoc.id,
                ...participantDoc.data()
            } as Participant;

            // Return even if submission is null (will show empty state)
            return { submission: submission || null, participant };
        },
        enabled: !!participantId && participantId !== 'undefined' && participantId !== 'null' && !!submissionDate && submissionDate !== 'undefined',
    });

    useEffect(() => {
        if (error) {
            console.error('Review load error:', error);
            toast({
                title: '감상평을 불러올 수 없습니다',
                description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요',
            });
            router.back();
        }
    }, [error, toast, router]);

    if (isLoading) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col overflow-hidden bg-white">
                    <TopBar
                        title="기록 로딩중..."
                        onBack={() => router.back()}
                        align="center"
                        className="bg-white border-b-0"
                    />
                    <main
                        className="flex-1 overflow-y-auto bg-white overflow-x-hidden touch-pan-y"
                        style={{ overscrollBehaviorX: 'none' }}
                    >
                        <div className="mx-auto max-w-md px-6 py-8">
                            <div className="space-y-4">
                                <div className="h-20 w-20 rounded-full bg-gray-100 mx-auto" />
                                <div className="h-6 w-32 rounded bg-gray-100 mx-auto" />
                                <div className="h-40 rounded-lg bg-gray-100 mt-8" />
                            </div>
                        </div>
                    </main>
                </div>
            </PageTransition>
        );
    }

    if (!data) return null;

    const { submission, participant } = data;

    // Format Date: "10월 22일의 기록"
    const formatDateTitle = (dateStr: string) => {
        if (!dateStr) return '오늘의 기록';
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month)}월 ${parseInt(day)}일의 기록`;
    };

    const handleProfileClick = () => {
        if (cohortId) {
            router.push(appRoutes.profile(participantId, cohortId));
        } else {
            router.push(`/app/profile/${participantId}`);
        }
    };

    // Empty state when no submission found
    if (!submission) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col overflow-hidden bg-white">
                    <TopBar
                        title={formatDateTitle(submissionDate || '')}
                        onBack={() => router.back()}
                        align="left"
                        className="bg-white border-b-0"
                    />

                    <main
                        className="flex-1 overflow-y-auto bg-white flex items-center justify-center overflow-x-hidden touch-pan-y"
                        style={{ overscrollBehaviorX: 'none' }}
                    >
                        <div className="mx-auto max-w-md px-6 text-center">
                            <div className="space-y-6">
                                {/* Icon */}
                                <div className="flex justify-center">
                                    <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                                        <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="space-y-3">
                                    <h3 className="font-bold text-lg text-gray-900">
                                        작성된 감상평이 없습니다
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        이 날짜에 {getFirstName(participant.name)}님의 독서 인증이 없습니다
                                    </p>
                                </div>

                                {/* CTA */}
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="bg-black text-white rounded-lg px-6 py-3 font-semibold text-base transition-colors hover:bg-gray-800 active:bg-gray-900"
                                >
                                    돌아가기
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden bg-white">
                <TopBar
                    title={formatDateTitle(submissionDate || '')}
                    onBack={() => router.back()}
                    align="left"
                    className="bg-white border-b-0"
                />

                <main
                    className="flex-1 overflow-y-auto bg-white overflow-x-hidden touch-pan-y"
                    style={{ overscrollBehaviorX: 'none' }}
                >
                    <div className="mx-auto max-w-md px-6 pb-24">

                        {/* 1. Profile Section (Top) */}
                        <div className="flex flex-col items-center gap-3 pb-8 border-b border-[#F2F4F6]">
                            <div
                                className="w-[64px] h-[64px] cursor-pointer transition-transform active:scale-95"
                                onClick={() => setProfileImageDialogOpen(true)}
                            >
                                <Avatar className="w-full h-full border-[2px] border-[#31363e]">
                                    <AvatarImage
                                        src={getResizedImageUrl(participant.profileImageCircle || participant.profileImage) || participant.profileImageCircle || participant.profileImage}
                                        alt={participant.name}
                                    />
                                    <AvatarFallback className="bg-gray-200 text-xl font-bold text-gray-700">
                                        {getInitials(participant.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={() => setProfileImageDialogOpen(true)}
                                    className="flex items-center gap-1 transition-opacity hover:opacity-70"
                                >
                                    <span className="text-[18px] font-bold text-[#191F28]">{getFirstName(participant.name)}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 18L15 12L9 6" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {/* 2. Book Info Section */}
                        <section className="mb-6">
                            <h2 className="text-[16px] font-bold text-[#191F28] mb-4">도서 정보</h2>

                            {/* Book Card (Yellow Style) */}
                            <div className="relative border-b-[2px] border-[#FFD362] rounded-t-[4px] px-3 py-3 min-h-[80px] bg-[#FFFDF3]">
                                <div className="flex items-start gap-3 pr-[72px]">
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <p className="text-[14px] font-bold leading-[1.4] text-[#31363e] truncate tracking-[-0.14px]">
                                            {submission.bookTitle || '제목 없음'}
                                        </p>
                                        <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">
                                            {submission.bookAuthor || '저자 미상'}
                                        </p>
                                    </div>
                                </div>
                                {/* Book Cover */}
                                {submission.bookCoverUrl && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[60px] h-[88px] bg-white rounded-[4px] overflow-hidden shadow-sm">
                                        <Image
                                            src={submission.bookCoverUrl}
                                            alt="책 표지"
                                            fill
                                            className="object-contain"
                                            sizes="60px"
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 3. Review Section */}
                        <section>
                            <h2 className="text-[16px] font-bold text-[#191F28] mb-4">감상평</h2>

                            {/* Certification Image Thumbnail */}
                            {submission.bookImageUrl && (
                                <>
                                    <button
                                        type="button"
                                        className="flex items-center gap-3 w-full p-3 bg-[#F8F9FA] hover:bg-[#F2F4F6] rounded-[12px] mb-4 transition-colors group"
                                        onClick={() => setImageDialogOpen(true)}
                                    >
                                        {/* 섬네일 이미지 */}
                                        <div className="relative w-[80px] h-[80px] rounded-[8px] overflow-hidden shrink-0 bg-[#E5E8EB]">
                                            <Image
                                                src={submission.bookImageUrl}
                                                alt="인증 이미지"
                                                fill
                                                className="object-cover"
                                                sizes="80px"
                                            />
                                        </div>
                                        {/* 텍스트 안내 */}
                                        <div className="flex-1 flex items-center justify-between min-w-0">
                                            <div className="text-left">
                                                <p className="text-[14px] font-medium text-[#333D4B]">인증 사진</p>
                                                <p className="text-[12px] text-[#8B95A1]">탭하여 크게 보기</p>
                                            </div>
                                            <Maximize2 size={20} className="text-[#8B95A1] group-hover:text-[#333D4B] transition-colors shrink-0" />
                                        </div>
                                    </button>
                                    <ImageDialog
                                        open={imageDialogOpen}
                                        onClose={() => setImageDialogOpen(false)}
                                        imageUrl={submission.bookImageUrl}
                                        alt="독서 인증 이미지"
                                    />
                                </>
                            )}

                            {/* Review Text */}
                            <div className="space-y-6">
                                <p className="text-[15px] text-[#191F28] leading-[1.7] whitespace-pre-wrap break-words">
                                    {submission.review || '작성된 감상평이 없습니다.'}
                                </p>
                            </div>
                        </section>

                    </div>
                </main>

                {/* Profile Image Dialog */}
                <ProfileImageDialog
                    participant={participant}
                    open={profileImageDialogOpen}
                    onClose={() => setProfileImageDialogOpen(false)}
                />
            </div>
        </PageTransition>
    );
}


export default function ReviewDetailPage({ params }: { params: Promise<{ participantId: string }> }) {
    const resolvedParams = use(params);
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReviewDetailContent params={resolvedParams} />
        </Suspense>
    );
}

