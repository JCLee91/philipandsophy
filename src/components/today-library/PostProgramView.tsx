'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import TopBar from '@/components/TopBar';
import UnifiedButton from '@/components/UnifiedButton';
import PageTransition from '@/components/PageTransition';
import { useActivityRecap, ClusterJourneyItem } from '@/hooks/use-activity-recap';
import { getResizedImageUrl } from '@/lib/image-utils';
import { appRoutes } from '@/lib/navigation';
import { getFirstName } from '@/lib/utils';
import type { Cohort, Participant } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

interface PostProgramViewProps {
    cohort: Cohort;
    cohortId: string;
    currentUserId: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** 미니 통계 카드 (가로 3칸용) */
function MiniStatCard({
    title,
    mainValue,
}: {
    title: string;
    mainValue: string;
}) {
    return (
        <div className="flex-1 bg-white rounded-[12px] p-4 shadow-sm min-h-[88px] flex flex-col">
            <p className="text-[13px] font-bold text-[#333D4B] mb-2">{title}</p>
            <p className="text-[22px] font-bold text-[#333D4B] mt-auto text-right">{mainValue}</p>
        </div>
    );
}

/** 동반자 카드 */
function CompanionCard({
    title,
    companions,
    onProfileClick,
    showCount = true,
}: {
    title: string;
    companions: Array<{ participantId: string; name: string; profileImage?: string; count: number }>;
    onProfileClick: (id: string) => void;
    showCount?: boolean;
}) {
    if (companions.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-[12px] p-4 shadow-sm flex flex-col h-full">
            <p className="text-[13px] font-bold text-[#333D4B] mb-3">{title}</p>
            {/* 프로필 목록 */}
            <div className="flex flex-wrap gap-2 flex-1 justify-center">
                {companions.map((companion, idx) => (
                    <button
                        key={companion.participantId}
                        onClick={() => onProfileClick(companion.participantId)}
                        className="flex flex-col items-center gap-0.5"
                    >
                        <div className="relative">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100">
                                <Image
                                    src={getResizedImageUrl(companion.profileImage) || '/image/default-profile.svg'}
                                    alt={companion.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            {idx === 0 && (
                                <div className="absolute -top-0.5 -right-0.5 text-xs">🥇</div>
                            )}
                        </div>
                        <span className="text-[10px] text-[#4E5968] font-medium truncate max-w-[48px]">
                            {getFirstName(companion.name)}
                        </span>
                        {showCount && (
                            <span className="text-[9px] text-[#8B95A1]">{companion.count}회</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** 클러스터 캐러셀 카드 */
function ClusterCard({
    item,
    members,
    onClick,
}: {
    item: ClusterJourneyItem;
    members: Participant[];
    onClick?: () => void;
}) {
    return (
        <div
            className="bg-[#F9FAFB] rounded-[16px] p-5 snap-center flex-shrink-0 w-[85%] min-w-[280px] cursor-pointer active:scale-[0.98] transition-transform"
            onClick={onClick}
        >
            {/* Header: Day + Category */}
            <div className="flex items-center gap-2 mb-3">
                <span className="bg-black text-white text-[12px] font-bold px-3 py-1 rounded-[12px]">
                    Day {item.dayNumber}
                </span>
                {item.clusterCategory && (
                    <span className="bg-[#E8F4FF] text-[#1A73E8] text-[12px] font-medium px-3 py-1 rounded-[12px]">
                        {item.clusterCategory}
                    </span>
                )}
            </div>

            {/* Cluster Name */}
            <h3 className="text-[14px] font-bold text-[#333D4B] mb-2">{item.clusterName}</h3>

            {/* Theme */}
            <p className="text-[13px] text-[#6B7684] mb-4 line-clamp-2">{item.clusterTheme}</p>

            {/* Members - 클릭 없이 표시만 */}
            <div className="flex flex-wrap gap-2">
                {members.slice(0, 6).map(member => (
                    <div
                        key={member.id}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                            <Image
                                src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || '/image/default-profile.svg'}
                                alt={member.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <span className="text-[10px] text-[#8B95A1] truncate max-w-[50px]">
                            {getFirstName(member.name)}
                        </span>
                    </div>
                ))}
                {members.length > 6 && (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-[11px] text-gray-500">
                        +{members.length - 6}
                    </div>
                )}
            </div>
        </div>
    );
}

/** 마우스 드래그 스크롤 훅 - 클릭과 드래그 구분 */
function useDragScroll() {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [hasMoved, setHasMoved] = useState(false);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!ref.current) return;
        setIsDragging(true);
        setHasMoved(false);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
        ref.current.style.cursor = 'grabbing';
    };

    const onMouseUp = () => {
        setIsDragging(false);
        if (ref.current) ref.current.style.cursor = 'grab';
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 1.5;

        // 이동 거리가 5px 이상이면 드래그로 간주
        if (Math.abs(walk) > 5) {
            setHasMoved(true);
        }

        ref.current.scrollLeft = scrollLeft - walk;
    };

    // 드래그 중일 때 자식 요소 클릭 방지
    const onClickCapture = (e: React.MouseEvent) => {
        if (hasMoved) {
            e.stopPropagation();
            e.preventDefault();
            setHasMoved(false);
        }
    };

    return {
        ref,
        onMouseDown,
        onMouseUp,
        onMouseMove,
        onMouseLeave: onMouseUp,
        onClickCapture,
    };
}

// ============================================================================
// Main Component
// ============================================================================

export default function PostProgramView({
    cohort,
    cohortId,
    currentUserId,
}: PostProgramViewProps) {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);

    // 전체 참가자 목록 조회
    const { data: allParticipants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
        queryKey: ['all-participants-post-program', cohortId],
        queryFn: async () => {
            const db = getDb();
            const participantsRef = collection(db, 'participants');
            const q = query(participantsRef, where('cohortId', '==', cohortId));
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }) as Participant)
                .filter(p => !p.isSuperAdmin && !p.isAdministrator && !p.isGhost);
        },
        staleTime: 5 * 60 * 1000,
    });

    // Activity Recap 계산
    const { activityRecap, isLoading: recapLoading } = useActivityRecap({
        participantId: currentUserId,
        cohort,
        allParticipants: allParticipants.map(p => ({
            id: p.id,
            name: p.name,
            profileImage: p.profileImageCircle || p.profileImage,
        })),
    });

    // 프로필 클릭 핸들러
    const handleProfileClick = useCallback((participantId: string) => {
        router.push(appRoutes.profile(participantId, cohortId));
    }, [router, cohortId]);

    // 캐러셀 네비게이션
    const journeyLength = activityRecap?.myClusterJourney.length || 0;

    // 마우스 드래그 스크롤
    const dragScroll = useDragScroll();

    // 스크롤 위치에 따른 현재 슬라이드 업데이트
    const handleScroll = useCallback(() => {
        if (!dragScroll.ref.current) return;
        const container = dragScroll.ref.current;
        const scrollLeft = container.scrollLeft;
        const cardWidth = container.offsetWidth;
        const newSlide = Math.round(scrollLeft / cardWidth);
        setCurrentSlide(newSlide);
    }, []);

    // 인디케이터 클릭 시 부드럽게 스크롤
    const goToSlide = useCallback((index: number) => {
        if (!dragScroll.ref.current) return;
        const container = dragScroll.ref.current;
        const cardWidth = container.offsetWidth;
        container.scrollTo({
            left: index * cardWidth,
            behavior: 'smooth'
        });
        setCurrentSlide(index);
    }, []);

    // 로딩 상태일 때도 기본 구조는 유지하고 내용만 스켈레톤으로 표시
    const isLoading = participantsLoading || recapLoading;

    // 클러스터 여정의 멤버 정보 맵핑
    const participantMap = new Map(allParticipants.map(p => [p.id, p]));

    const getClusterMembers = (memberIds: string[]): Participant[] => {
        return memberIds
            .map(id => participantMap.get(id))
            .filter((p): p is Participant => !!p);
    };

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden">
                {/* Header */}
                <TopBar
                    title="우리의 여정"
                    onBack={() => router.push(appRoutes.chat(cohortId))}
                    align="center"
                    className="bg-[#F6F6F6] border-b-0"
                />

                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F6F6F6]">
                    {/* Gray Section: Title + Stats */}
                    <section className="bg-[#F6F6F6] px-6 pt-4 pb-3">
                        {/* Title */}
                        <div className="text-center mb-6">
                            <h1 className="text-[22px] font-bold text-[#333D4B] mb-2">
                                🎉 2주간의 여정이 끝났어요!
                            </h1>
                            <p className="text-[14px] text-[#6B7684]">
                                {isLoading ? (
                                    <span className="inline-block w-32 h-4 bg-gray-200 rounded animate-pulse" />
                                ) : (
                                    `${allParticipants.length}명의 독서친구들과 함께한 시간`
                                )}
                            </p>
                        </div>

                        {/* Stats Cards */}
                        {isLoading ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex-1 bg-white rounded-[12px] h-24 animate-pulse" />
                                    ))}
                                </div>
                                <div className="bg-white rounded-[12px] h-32 animate-pulse" />
                                <div className="bg-white rounded-[12px] h-32 animate-pulse" />
                            </div>
                        ) : (
                            activityRecap && (
                                <div className="flex flex-col gap-3">
                                    {/* 3개 통계 가로 배치 */}
                                    <div className="flex gap-2">
                                        <MiniStatCard
                                            title="독서 기록"
                                            mainValue={`${activityRecap.certifiedDays}/${activityRecap.totalDays}일`}
                                        />
                                        <MiniStatCard
                                            title="감상평 평균"
                                            mainValue={`${activityRecap.avgReviewLength}자`}
                                        />
                                        <MiniStatCard
                                            title="가치관 평균"
                                            mainValue={`${activityRecap.avgDailyAnswerLength}자`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-stretch">
                                        <CompanionCard
                                            title="자주 같은 모임이 된 친구"
                                            companions={activityRecap.mostFrequentCompanions}
                                            onProfileClick={handleProfileClick}
                                        />
                                        <CompanionCard
                                            title="자주 다른 모임이었던 친구"
                                            companions={activityRecap.mostDifferentCompanions}
                                            onProfileClick={handleProfileClick}
                                            showCount={false}
                                        />
                                    </div>
                                </div>
                            )
                        )}
                    </section>

                    {/* Cluster Journey */}
                    {isLoading ? (
                        <section className="px-6 mb-3">
                            <div className="bg-white rounded-[12px] p-4 shadow-sm">
                                <div className="w-40 h-4 bg-gray-200 rounded mb-3 animate-pulse" />
                                <div className="w-full h-32 bg-gray-100 rounded-[12px] animate-pulse" />
                            </div>
                        </section>
                    ) : (
                        activityRecap && activityRecap.myClusterJourney.length > 0 && (
                            <section className="px-6 mb-3">
                                <div className="bg-white rounded-[12px] p-4 shadow-sm">
                                    <p className="text-[13px] font-bold text-[#333D4B] mb-3">나의 모임 히스토리</p>
                                    {/* Carousel */}
                                    <div className="relative -mx-1">
                                        <div
                                            ref={dragScroll.ref}
                                            className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-3 px-1 scrollbar-hide cursor-grab select-none"
                                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            onMouseDown={dragScroll.onMouseDown}
                                            onMouseUp={dragScroll.onMouseUp}
                                            onMouseMove={dragScroll.onMouseMove}
                                            onMouseLeave={dragScroll.onMouseLeave}
                                            onClickCapture={dragScroll.onClickCapture}
                                            onScroll={handleScroll}
                                        >
                                            {activityRecap.myClusterJourney.map((item) => (
                                                <ClusterCard
                                                    key={item.date}
                                                    item={item}
                                                    members={getClusterMembers(item.memberIds)}
                                                    onClick={() => router.push(`${appRoutes.todayLibrary(cohortId)}&matchingDate=${item.date}&from=recap`)}
                                                />
                                            ))}
                                        </div>

                                        {/* Indicators */}
                                        <div className="flex justify-center gap-1.5">
                                            {activityRecap.myClusterJourney.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => goToSlide(idx)}
                                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentSlide ? 'bg-black' : 'bg-gray-300'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )
                    )}

                    {/* All Members List */}
                    {isLoading ? (
                        <section className="px-6 pb-32">
                            <div className="w-32 h-6 bg-gray-200 rounded mb-4 animate-pulse" />
                            <div className="bg-white rounded-[12px] p-4 shadow-sm">
                                <div className="flex flex-col gap-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="w-full h-14 bg-gray-100 rounded-[8px] animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        </section>
                    ) : (
                        activityRecap && (
                            <section className="px-6 pb-32">
                                <div className="bg-white rounded-[12px] p-4 shadow-sm">
                                    <p className="text-[13px] font-bold text-[#333D4B] mb-1">전체 멤버</p>
                                    <p className="text-[12px] text-[#8B95A1] mb-3">
                                        모든 프로필북이 개방됐어요. 파티 전에 미리 살펴보세요!
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {activityRecap.allCompanions.map((companion, idx) => (
                                            <button
                                                key={companion.participantId}
                                                onClick={() => handleProfileClick(companion.participantId)}
                                                className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-[10px] hover:bg-gray-100 transition-colors"
                                            >
                                                <span className="text-[12px] text-[#8B95A1] w-6 text-center">{idx + 1}</span>
                                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                                                    <Image
                                                        src={getResizedImageUrl(companion.profileImage) || '/image/default-profile.svg'}
                                                        alt={companion.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <span className="flex-1 text-[14px] font-medium text-[#333D4B] text-left">
                                                    {companion.name}
                                                </span>
                                                <span className="text-[12px] text-[#8B95A1]">
                                                    {companion.count > 0 ? `같은 모임 ${companion.count}회` : '아직 만남 없음'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )
                    )}
                </main>

                {/* Fixed Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#F2F2F2] z-50 safe-area-bottom">
                    <UnifiedButton
                        fullWidth
                        onClick={() => router.push(appRoutes.profile(currentUserId, cohortId))}
                    >
                        내 프로필 북 보기
                    </UnifiedButton>
                </div>

                <style jsx>{`
          .safe-area-bottom {
            padding-bottom: calc(24px + env(safe-area-inset-bottom));
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            scroll-behavior: smooth;
          }
        `}</style>
            </div>
        </PageTransition>
    );
}
