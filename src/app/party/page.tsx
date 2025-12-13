'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import TopBar from '@/components/TopBar';
import PageTransition from '@/components/PageTransition';
import PartyParticipantList from '@/components/party/PartyParticipantList';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';

import { useAuth } from '@/contexts/AuthContext';

import { getParticipantsByPhoneNumbers } from '@/lib/firebase/participants';
import { getCohortsByIds } from '@/lib/firebase/cohorts';
import { PARTY_GUEST_PHONE_NUMBERS } from '@/constants/party-guests';
import { Participant } from '@/types/database';

function normalizePhoneNumber(phoneNumber?: string | null) {
    if (!phoneNumber) return null;
    const normalized = phoneNumber.replace(/\D/g, '');
    return normalized.length > 0 ? normalized : null;
}

function parseCohortNumber(cohortId: string) {
    const extracted = cohortId.replace(/\D/g, '');
    const n = Number.parseInt(extracted, 10);
    return Number.isFinite(n) ? n : 0;
}

export default function PartyPage() {
    const router = useRouter();
    const { participant: currentParticipant, participantStatus, isLoading: authLoading, logout } = useAuth();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [highlightParticipantId, setHighlightParticipantId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchGuests() {
            try {
                if (!currentParticipant || participantStatus !== 'ready') {
                    return;
                }
                setIsLoading(true);
                setErrorMessage(null);
                setHighlightParticipantId(null);
                if (PARTY_GUEST_PHONE_NUMBERS.length === 0) {
                    setParticipants([]);
                } else {
                    const normalizedPhones = PARTY_GUEST_PHONE_NUMBERS
                        .map((n) => normalizePhoneNumber(n))
                        .filter(Boolean) as string[];
                    const data = await getParticipantsByPhoneNumbers(normalizedPhones);
                    const cohortIds = [...new Set(data.map((p) => p.cohortId).filter(Boolean))];
                    const cohorts = await getCohortsByIds(cohortIds);
                    const cohortIsActive = new Map(cohorts.map((c) => [c.id, Boolean(c.isActive)]));

                    // 전화번호 기준으로 중복 참가자(재참여)를 1명으로 합치기:
                    // 활성 기수 우선 → 없으면 최신 기수(숫자 큰 cohortId) 선택
                    const orderIndexByPhone = new Map<string, number>();
                    normalizedPhones.forEach((phone, idx) => orderIndexByPhone.set(phone, idx));

                    const groups = new Map<string, Participant[]>();
                    data.forEach((p) => {
                        const phoneKey = normalizePhoneNumber(p.phoneNumber);
                        if (!phoneKey) return;
                        const list = groups.get(phoneKey) ?? [];
                        list.push(p);
                        groups.set(phoneKey, list);
                    });

                    const merged = normalizedPhones
                        .map((phone) => {
                            const group = groups.get(phone);
                            if (!group || group.length === 0) return null;

                            const ranked = [...group].sort((a, b) => {
                                const aActive = cohortIsActive.get(a.cohortId) ? 1 : 0;
                                const bActive = cohortIsActive.get(b.cohortId) ? 1 : 0;
                                if (aActive !== bActive) return bActive - aActive;
                                return parseCohortNumber(b.cohortId) - parseCohortNumber(a.cohortId);
                            });

                            return {
                                phone,
                                participant: ranked[0],
                                orderIndex: orderIndexByPhone.get(phone) ?? Number.POSITIVE_INFINITY,
                            };
                        })
                        .filter(Boolean) as { phone: string; participant: Participant; orderIndex: number }[];

                    merged.sort((a, b) => a.orderIndex - b.orderIndex);
                    const ordered = merged.map((x) => x.participant);

                    const viewerPhone = normalizePhoneNumber(currentParticipant.phoneNumber);
                    const myPartyParticipantId = viewerPhone
                        ? (merged.find((x) => x.phone === viewerPhone)?.participant.id ?? null)
                        : null;
                    setHighlightParticipantId(myPartyParticipantId);

                    // ✅ 정렬 정책
                    // - 파티 명단(전화번호)에 포함된 경우에만 "내 프로필북" 고정/표시
                    // - 추가로, 내 프로필북이 속한 '기수(cohortId)'의 멤버들을 우선 노출
                    if (myPartyParticipantId) {
                        const mine = merged.find((x) => x.participant.id === myPartyParticipantId)?.participant ?? null;
                        if (mine) {
                            const viewerCohortId = mine.cohortId;
                            const withoutMe = ordered.filter((p) => p.id !== myPartyParticipantId);
                            const sameCohort = withoutMe.filter((p) => p.cohortId === viewerCohortId);
                            const otherCohort = withoutMe.filter((p) => p.cohortId !== viewerCohortId);

                            setParticipants([mine, ...sameCohort, ...otherCohort]);
                            return;
                        }
                    }

                    setParticipants(ordered);
                }
            } catch (error) {
                console.error('Failed to fetch party guests:', error);
                setErrorMessage('참가자 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
            } finally {
                setIsLoading(false);
            }
        }

        fetchGuests();
    }, [currentParticipant, participantStatus]);

    const handleProfileClick = (participantId: string) => {
        // 코호트 ID가 필요하지만, 파티 페이지는 기수 초월이므로 
        // 해당 참가자의 cohortId를 가져와서 사용해야 함.
        // getParticipantsByIds로 가져온 데이터에 cohortId가 있음.
        const participant = participants.find(p => p.id === participantId);
        if (participant) {
            const params = new URLSearchParams({
                cohort: participant.cohortId,
                from: 'party',
            });
            router.push(`/party/profile/${encodeURIComponent(participantId)}?${params.toString()}`);
        }
    };

    if (isLoading) {
        return <LoadingSkeleton title="월간 멤버스 파티" />;
    }

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden bg-[#F6F6F6] min-h-screen">
                <TopBar
                    title="월간 멤버스 파티"
                    align="center"
                    className="bg-white border-b-0"
                    rightAction={
                        <button
                            type="button"
                            onClick={async () => {
                                await logout();
                                window.location.href = '/party';
                            }}
                            className="rounded-md px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            로그아웃
                        </button>
                    }
                />

                <main className="flex-1 overflow-y-auto px-6 py-4">
                    {/* 안내 문구 */}
                    <div className="bg-white rounded-[12px] p-4 shadow-sm mb-4">
                        <p className="text-[15px] font-bold text-[#333D4B] mb-1">
                            참가자 리스트
                        </p>
                        <p className="text-[13px] text-[#8B95A1] leading-relaxed">
                            이번 파티에 함께하는 멤버들입니다.<br />
                            프로필북을 미리 읽어보고 오시면 더 깊은 대화를 나눌 수 있어요!
                        </p>
                    </div>

                    <PartyParticipantList
                        participants={participants}
                        onProfileClick={handleProfileClick}
                        emptyMessage={errorMessage ?? undefined}
                        highlightParticipantId={highlightParticipantId ?? undefined}
                    />
                </main>
            </div>
        </PageTransition>
    );
}
