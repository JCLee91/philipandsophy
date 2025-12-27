'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getSubmissionDate, isMatchingInProgress } from '@/lib/date-utils';
import { findLatestClusterMatching } from '@/lib/matching-utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { getFirstName } from '@/lib/utils';
import { appRoutes } from '@/lib/navigation';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import { Cluster, Participant } from '@/types/database';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';

export default function OtherClustersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cohortId = searchParams.get('cohort');

    const { participant, isLoading: sessionLoading } = useAuth();
    const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
    const { toast } = useToast();
    const currentUserId = participant?.id;
    const isLegacyCohort = cohort ? cohort.useClusterMatching !== true : false;

    // 오늘의 서재와 동일한 로직: 오늘 인증 여부 확인
    const todayDate = getSubmissionDate();
    const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);
    const viewerSubmissionDates = useMemo(
        () => new Set(viewerSubmissions.map(s => s.submissionDate)),
        [viewerSubmissions]
    );
    const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
    const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;

    // Check access permission
    useEffect(() => {
        if (!sessionLoading && !cohortLoading) {
            if (!participant || !cohort || !cohortId) {
                router.replace('/app');
                return;
            }
        }
    }, [sessionLoading, cohortLoading, participant, cohort, cohortId, router]);

    // Get matching data - 오늘의 서재와 동일한 로직 사용
    const clusterMatching = useMemo(() => {
        if (!cohort?.dailyFeaturedParticipants || !currentUserId) return null;

        return findLatestClusterMatching(
            cohort.dailyFeaturedParticipants,
            currentUserId,
            preferredMatchingDate
        );
    }, [cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

    const myClusterId = clusterMatching?.clusterId;

    // 모든 클러스터 가져오기 (해당 날짜의 전체 클러스터)
    const clusters = useMemo(() => {
        if (!clusterMatching || !cohort?.dailyFeaturedParticipants) return [];

        const matchingDate = clusterMatching.matchingDate;
        const dayData = cohort.dailyFeaturedParticipants[matchingDate];
        if (!dayData?.clusters) return [];

        const allClusters = Object.values(dayData.clusters) as Cluster[];
        // 내 모임을 상단에 배치
        return allClusters.sort((a, b) => {
            if (a.id === myClusterId) return -1;
            if (b.id === myClusterId) return 1;
            return 0;
        });
    }, [clusterMatching, cohort?.dailyFeaturedParticipants, myClusterId]);

    // 모든 클러스터 멤버 ID 추출
    const allMemberIds = useMemo(() => {
        const ids = new Set<string>();
        clusters.forEach(cluster => {
            cluster.memberIds.forEach(id => ids.add(id));
        });
        return Array.from(ids);
    }, [clusters]);

    // 멤버 정보 조회
    const { data: membersMap = {} } = useQuery({
        queryKey: ['cluster-members', allMemberIds],
        queryFn: async () => {
            if (allMemberIds.length === 0) return {};

            const db = getDb();
            const participantsRef = collection(db, 'participants');

            // Firestore 'in' 쿼리는 최대 30개까지만 지원
            const chunks: string[][] = [];
            for (let i = 0; i < allMemberIds.length; i += 30) {
                chunks.push(allMemberIds.slice(i, i + 30));
            }

            const results: Record<string, Participant> = {};

            for (const chunk of chunks) {
                const q = query(participantsRef, where('__name__', 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(doc => {
                    results[doc.id] = { id: doc.id, ...doc.data() } as Participant;
                });
            }

            return results;
        },
        enabled: allMemberIds.length > 0,
        staleTime: 60000,
    });

    // 클러스터 카드 클릭 핸들러 - today-library로 이동 (인증 체크 없음, 맛보기 허용)
    const handleClusterClick = (clusterId: string) => {
        // cluster 파라미터와 matchingDate를 함께 today-library로 이동
        const matchingDate = clusterMatching?.matchingDate;
        if (matchingDate) {
            router.push(`${appRoutes.todayLibrary(cohortId!)}&cluster=${clusterId}&matchingDate=${encodeURIComponent(matchingDate)}`);
        } else {
            router.push(`${appRoutes.todayLibrary(cohortId!)}&cluster=${clusterId}`);
        }
    };

    if (sessionLoading || cohortLoading || viewerSubmissionLoading) {
        return <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>;
    }

    if (!participant || !cohort) return null;

    // 매칭 진행 중 (새벽 2시 0분 ~ 2시 29분)
    if (!isLegacyCohort && isMatchingInProgress()) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col h-screen bg-gray-50">
                    <TopBar
                        title="다른 모임 구경하기"
                        onBack={() => {
                            const matchingDate = clusterMatching?.matchingDate;
                            if (matchingDate) {
                                router.push(`${appRoutes.todayLibrary(cohortId!)}&matchingDate=${encodeURIComponent(matchingDate)}`);
                            } else {
                                router.push(appRoutes.todayLibrary(cohortId!));
                            }
                        }}
                        position="fixed"
                    />
                    <main className="flex-1 overflow-y-auto pt-16 pb-20 px-4 flex items-center justify-center">
                        <div className="mx-auto max-w-md px-6">
                            <div className="text-center space-y-6">
                                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900" />
                                </div>
                                <h3 className="font-bold text-lg text-gray-900">
                                    오늘의 독서모임을 준비 중이에요
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    잠시 후 다시 확인해 주세요
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </PageTransition>
        );
    }

    if (!clusterMatching || clusters.length === 0) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col h-screen bg-gray-50">
                    <TopBar
                        title="다른 모임 구경하기"
                        onBack={() => {
                            const matchingDate = clusterMatching?.matchingDate;
                            if (matchingDate) {
                                router.push(`${appRoutes.todayLibrary(cohortId!)}&matchingDate=${encodeURIComponent(matchingDate)}`);
                            } else {
                                router.push(appRoutes.todayLibrary(cohortId!));
                            }
                        }}
                        position="fixed"
                    />
                    <main className="flex-1 overflow-y-auto pt-16 pb-20 px-4 flex items-center justify-center">
                        <div className="mx-auto max-w-md px-6">
                            <div className="text-center space-y-6">
                                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                                    📚
                                </div>
                                <h3 className="font-bold text-lg text-gray-900">
                                    다른 모임 구경하기는<br />지금은 지원하지 않아요
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    이전 기수 데이터는 오늘의 서재에서 계속 확인할 수 있어요.
                                </p>
                                <UnifiedButton
                                    variant="primary"
                                    onClick={() => router.push(appRoutes.todayLibrary(cohortId!))}
                                >
                                    오늘의 서재로 돌아가기
                                </UnifiedButton>
                            </div>
                        </div>
                    </main>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="app-shell flex flex-col h-screen bg-gray-50">
                <TopBar
                    title="다른 모임 구경하기"
                    onBack={() => {
                        const matchingDate = clusterMatching?.matchingDate;
                        if (matchingDate) {
                            router.push(`${appRoutes.todayLibrary(cohortId!)}&matchingDate=${encodeURIComponent(matchingDate)}`);
                        } else {
                            router.push(appRoutes.todayLibrary(cohortId!));
                        }
                    }}
                    position="fixed"
                />

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto pt-16 pb-20 px-4">
                    <div className="py-6 space-y-4">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                다른 모임들은<br />어떤 이야기를 나눴을까요?
                            </h2>
                            <p className="text-sm text-gray-500">
                                비슷한 취향을 가진 멤버들이 모여<br />
                                나눈 생각들을 살짝 엿보세요
                            </p>
                        </div>

                        <div className="grid gap-4">
                            {clusters.map((cluster) => (
                                <button
                                    key={cluster.id}
                                    onClick={() => handleClusterClick(cluster.id)}
                                    className={`bg-white rounded-xl p-5 shadow-xs border text-left transition-all hover:shadow-md active:scale-[0.98] ${cluster.id === myClusterId ? 'border-black ring-1 ring-black' : 'border-gray-100'
                                        }`}
                                >
                                    <div className="flex justify-between items-start gap-3 mb-3">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <span className="text-2xl shrink-0">{cluster.emoji}</span>
                                            <h3 className="font-bold text-lg text-gray-900">
                                                {cluster.theme}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {cluster.id === myClusterId && (
                                                <span className="bg-black text-white text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                                    내 모임
                                                </span>
                                            )}
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                                                {cluster.memberIds.length}명
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-black text-white text-[12px] font-bold px-3 py-1 rounded-[12px]">
                                                {cluster.category || '감상평'}
                                            </span>
                                        </div>

                                        {cluster.reasoning && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                                    "{cluster.reasoning}"
                                                </p>
                                            </div>
                                        )}

                                        {/* 멤버 리스트 (사진 + 이름) */}
                                        <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-gray-100">
                                            {cluster.memberIds.map((memberId) => {
                                                const member = membersMap[memberId];
                                                return (
                                                    <div key={memberId} className="flex flex-col items-center gap-1">
                                                        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                                                            {member?.profileImage ? (
                                                                <Image
                                                                    src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage}
                                                                    alt={member.name || ''}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="36px"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                                                                    ?
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-gray-500">
                                                            {member?.name ? getFirstName(member.name) : '?'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </button>
                            ))}

                            {clusters.length === 0 && (
                                <div className="text-center py-10 text-gray-500">
                                    표시할 모임 정보가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
