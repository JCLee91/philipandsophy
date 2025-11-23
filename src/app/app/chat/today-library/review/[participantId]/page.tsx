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
import { getInitials } from '@/lib/utils';
import { getResizedImageUrl } from '@/lib/image-utils';

// ✅ Disable static generation
export const dynamic = 'force-dynamic';

interface ReviewData {
    submission: ReadingSubmission;
    participant: Participant;
}

function ReviewDetailContent({ params }: { params: { participantId: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { participant: currentUser } = useAuth();
    const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);

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

            if (!submission) {
                // throw new Error('Submission not found');
                // 목업 확인을 위해 가짜 데이터 반환
                submission = {
                    id: 'mock-id',
                    participantId,
                    submissionDate,
                    status: 'approved',
                    bookTitle: '노르웨이의 숲',
                    bookAuthor: '무라카미 하루키',
                    bookCoverUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937461097.jpg',
                    bookImageUrl: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937461097.jpg', // 임시 이미지
                    review: `이 문장은 미도리의 밝음 뒤에 숨어 있는 깊은 슬픔을 보여준다. 겉으로는 가볍고 유쾌하지만, 그녀의 농담에는 늘 외로움이 깃들어 있다. 와타나베에게 미도리는 단순한 연인이 아니라, 살아 있음을 일깨워주는 존재였다.

미도리는 어쩌면 삶의 그 자체 같다. 불완전하고, 예측할 수 없으며, 때로는 잔인할 만큼 솔직하다. 그녀는 상처를 숨기지 않고, 오히려 그것을 품은 채 웃는다. 그 모습이야말로 이 소설이 말하는 진짜 어른이 되는 과정일지도 모른다.

책을 덮고 나면 이상하게도 마음이 먹먹해진다. 우리 모두에게는 언젠가 만났던 미도리가 있고, 그 사람 덕분에 다시 살아가기로 결심했던 순간이 있기 때문이다.`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as unknown as ReadingSubmission;
            }

            // Fetch participant
            const participantDoc = await getDoc(doc(db, 'participants', participantId));
            if (!participantDoc.exists()) {
                // If participant is not found, it might be a data consistency issue or deleted user.
                // We can throw a specific error or return a mock participant if that's safer for the UI.
                // For now, let's throw a clear error.
                console.error(`Participant document not found for ID: ${participantId}`);
                throw new Error('Participant not found');
            }

            const participant = {
                id: participantDoc.id,
                ...participantDoc.data()
            } as Participant;

            return { submission, participant };
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
                    <main className="flex-1 overflow-y-auto bg-white">
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

    // --- Mock Data Injection for Verification ---
    const mockJob = "은행원";
    const mockBookDescription = "보통의 연인들을 위한 보통의 연애담. 알랭 드 보통의 최고의 소설 연애가 사랑이 되는 순간, 우연이 사랑이 되는 순간의 비밀 사랑은 무엇이고 연애란 또 무엇인가?";
    const mockBookImageUrl = "https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937461097.jpg";
    const mockQuote = `터 시작하고 싶어, 하고 말했다.
  미도리는 오래도록 수화기 저편에서 침묵을 지켰다. 마치 온 세상의 가느다란 빗줄기가 온 세상의 잔디밭 위에 내리는 듯한 그런 침묵이 이어졌다. 나는 그동안 창에 이마를 대고 눈을 감았다. 이윽고 미도리가 입을 열었다. "너, 지금 어디야?" 그녀는 조용한 목소리로 말했다.
  나는 지금 어디에 있지?
  나는 수화기를 든 채 고개를 들고 공중전화 부스 주변을 휙 둘러보았다. 나는 지금 어디에 있지? 그러나 거기가 어디`;

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

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden bg-white">
                <TopBar
                    title={formatDateTitle(submissionDate || '')}
                    onBack={() => router.back()}
                    align="left"
                    className="bg-white border-b-0"
                />

                <main className="flex-1 overflow-y-auto bg-white">
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
                                    <span className="text-[18px] font-bold text-[#191F28]">{participant.name}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 18L15 12L9 6" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <span className="text-[13px] text-[#8B95A1]">{(participant as any).job || mockJob}</span>
                            </div>
                        </div>
                        {/* 2. Book Info Section */}
                        <section className="mb-10">
                            <h2 className="text-[16px] font-bold text-[#191F28] mb-4">도서 정보</h2>

                            {/* Book Card (Yellow Style) */}
                            <div className="relative border-b-[2px] border-[#FFD362] rounded-t-[4px] px-3 py-3 min-h-[100px] bg-[#FFFDF3] mb-3">
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

                            {/* Book Description */}
                            <p className="text-[14px] text-[#4E5968] leading-[1.6] break-keep">
                                {submission.bookDescription || mockBookDescription}
                            </p>
                        </section>

                        {/* 3. Review Section */}
                        <section>
                            <h2 className="text-[16px] font-bold text-[#191F28] mb-4">감상평</h2>

                            {/* Certification Image (Gray Box) */}
                            {submission.bookImageUrl && (
                                <div className="bg-[#F2F4F6] rounded-[8px] overflow-hidden mb-6">
                                    <div className="relative w-full aspect-[4/3]">
                                        <Image
                                            src={submission.bookImageUrl}
                                            alt="인증 이미지"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 448px"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Review Text */}
                            <div className="space-y-6">
                                <p className="text-[15px] text-[#191F28] leading-[1.7] whitespace-pre-wrap">
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

