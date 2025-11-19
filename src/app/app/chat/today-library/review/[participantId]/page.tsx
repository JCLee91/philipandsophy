'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import PageTransition from '@/components/PageTransition';
import BackHeader from '@/components/BackHeader';
import UnifiedButton from '@/components/UnifiedButton';
import Image from 'next/image';
import { ReadingSubmission, Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

    const participantId = params.participantId;
    const submissionDate = searchParams.get('date');
    const cohortId = searchParams.get('cohort');

    // Fetch review data
    const { data, isLoading, error } = useQuery<ReviewData>({
        queryKey: ['review-detail', participantId, submissionDate],
        queryFn: async () => {
            if (!submissionDate) throw new Error('Missing date parameter');

            const db = getDb();

            // Fetch submission
            const submissionsRef = collection(db, 'reading_submissions');
            const q = query(
                submissionsRef,
                where('participantId', '==', participantId),
                where('submissionDate', '==', submissionDate),
                where('status', '==', 'approved')
            );
            const submissionSnapshot = await getDocs(q);

            if (submissionSnapshot.empty) {
                throw new Error('Submission not found');
            }

            const submission = {
                id: submissionSnapshot.docs[0].id,
                ...submissionSnapshot.docs[0].data()
            } as ReadingSubmission;

            // Fetch participant
            const participantDoc = await getDoc(doc(db, 'participants', participantId));
            if (!participantDoc.exists()) {
                throw new Error('Participant not found');
            }

            const participant = {
                id: participantDoc.id,
                ...participantDoc.data()
            } as Participant;

            return { submission, participant };
        },
        enabled: !!participantId && !!submissionDate,
    });

    useEffect(() => {
        if (error) {
            toast({
                title: '감상평을 불러올 수 없습니다',
                description: '잠시 후 다시 시도해주세요',
            });
            router.back();
        }
    }, [error, toast, router]);

    if (isLoading) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col overflow-hidden">
                    <BackHeader
                        title="감상평"
                        onBack={() => router.back()}
                    />
                    <main className="app-main-content flex-1 overflow-y-auto bg-background">
                        <div className="mx-auto max-w-md px-6 py-8">
                            <div className="space-y-4">
                                <div className="h-64 shimmer rounded-lg" />
                                <div className="h-20 shimmer rounded-lg" />
                                <div className="h-40 shimmer rounded-lg" />
                            </div>
                        </div>
                    </main>
                </div>
            </PageTransition>
        );
    }

    if (!data) return null;

    const { submission, participant } = data;

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden">
                <BackHeader
                    title={`${participant.name}님의 감상평`}
                    onBack={() => router.back()}
                />

                <main className="app-main-content flex-1 overflow-y-auto bg-background">
                    <div className="mx-auto max-w-md px-6 py-6 pb-24">
                        <div className="space-y-6">
                            {/* Certification Photo */}
                            {submission.bookImageUrl && (
                                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                                    <Image
                                        src={submission.bookImageUrl}
                                        alt="독서 인증 사진"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 448px"
                                    />
                                </div>
                            )}

                            {/* Book Info */}
                            <div className="flex items-start gap-4">
                                {submission.bookCoverUrl && (
                                    <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                        <Image
                                            src={submission.bookCoverUrl}
                                            alt={submission.bookTitle || '책 표지'}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h2 className="font-bold text-lg text-gray-900">
                                        {submission.bookTitle}
                                    </h2>
                                    {submission.bookAuthor && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {submission.bookAuthor}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Review */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base text-gray-900">
                                    감상평
                                </h3>
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {submission.review}
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer with Profile Button */}
                <div className="app-footer-actions border-t border-border bg-background p-4 pb-safe">
                    <div className="mx-auto flex max-w-md flex-col gap-3">
                        <UnifiedButton
                            variant="primary"
                            onClick={() => {
                                if (cohortId) {
                                    router.push(appRoutes.profile(participantId, cohortId));
                                } else {
                                    router.push(`/app/profile/${participantId}`);
                                }
                            }}
                            className="w-full"
                        >
                            {participant.name}님의 프로필북 보기
                        </UnifiedButton>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}

export default function ReviewDetailPage({ params }: { params: { participantId: string } }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReviewDetailContent params={params} />
        </Suspense>
    );
}
