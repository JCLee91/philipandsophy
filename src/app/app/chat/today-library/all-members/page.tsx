'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import TopBar from '@/components/TopBar';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useCohort } from '@/hooks/use-cohorts';
import { getResizedImageUrl } from '@/lib/image-utils';
import { appRoutes } from '@/lib/navigation';
import { getFirstName } from '@/lib/utils';
import type { Participant } from '@/types/database';

// ============================================================================
// Content Component
// ============================================================================

function AllMembersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cohortId = searchParams.get('cohort');

    const { participant } = useAuth();
    const currentUserId = participant?.id;

    const { data: cohort } = useCohort(cohortId || undefined);

    // 전체 참가자 목록 조회
    const { data: allParticipants = [], isLoading } = useQuery<Participant[]>({
        queryKey: ['all-members-list', cohortId],
        queryFn: async () => {
            if (!cohortId) return [];

            const db = getDb();
            const participantsRef = collection(db, 'participants');
            const q = query(participantsRef, where('cohortId', '==', cohortId));
            const snapshot = await getDocs(q);

            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }) as Participant)
                .filter(p => !p.isSuperAdmin && !p.isAdministrator && !p.isGhost && p.id !== currentUserId)
                .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        },
        enabled: !!cohortId,
        staleTime: 5 * 60 * 1000,
    });

    // 프로필 클릭
    const handleProfileClick = (participantId: string) => {
        router.push(appRoutes.profile(participantId, cohortId!));
    };

    // 로딩
    if (isLoading) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col overflow-hidden">
                    <TopBar title="전체 멤버" onBack={() => router.back()} align="center" />
                    <main className="flex-1 flex items-center justify-center">
                        <div className="animate-pulse text-gray-400">로딩 중...</div>
                    </main>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden">
                <TopBar
                    title={`전체 멤버 (${allParticipants.length}명)`}
                    onBack={() => router.back()}
                    align="center"
                />

                <main className="flex-1 overflow-y-auto bg-white px-6 py-4">
                    {/* 2-column grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {allParticipants.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleProfileClick(p.id)}
                                className="flex flex-col items-center gap-2 p-4 bg-[#F9FAFB] rounded-[12px] hover:bg-gray-100 transition-colors"
                            >
                                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                                    <Image
                                        src={getResizedImageUrl(p.profileImageCircle || p.profileImage) || '/image/default-profile.svg'}
                                        alt={p.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <span className="text-[14px] font-medium text-[#333D4B] truncate max-w-full">
                                    {getFirstName(p.name)}
                                </span>
                                {p.occupation && (
                                    <span className="text-[12px] text-[#8B95A1] truncate max-w-full">
                                        {p.occupation}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {allParticipants.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <p>멤버가 없습니다</p>
                        </div>
                    )}
                </main>
            </div>
        </PageTransition>
    );
}

// ============================================================================
// Page Component
// ============================================================================

export default function AllMembersPage() {
    return (
        <Suspense fallback={
            <div className="app-shell flex items-center justify-center">
                <div className="animate-pulse text-gray-400">로딩 중...</div>
            </div>
        }>
            <AllMembersContent />
        </Suspense>
    );
}
