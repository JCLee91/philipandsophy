'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import TopBar from '@/components/TopBar';
import PageTransition from '@/components/PageTransition';
import PartyTabs from '@/components/party/PartyTabs';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';
import CohortSelectModal from '@/components/party/CohortSelectModal';

import { useAuth } from '@/contexts/AuthContext';

import { getParticipantsByPhoneNumbers } from '@/lib/firebase/participants';
import { getCohortsByIds } from '@/lib/firebase/cohorts';
import { PARTY_GUEST_PHONE_NUMBERS } from '@/constants/party-guests';
import { Participant } from '@/types/database';

// ARCHIVED(2025-12): 연말파티 종료 - 다음 시즌에 이 플래그를 false로 변경하면 재활성화
const PARTY_ARCHIVED = true;

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

    // 재참여자 프로필북 선택 관련 상태
    const [myAllCohortParticipants, setMyAllCohortParticipants] = useState<Participant[]>([]);
    const [showCohortSelectModal, setShowCohortSelectModal] = useState(false);
    const [selectedCohortParticipant, setSelectedCohortParticipant] = useState<Participant | null>(null);

    useEffect(() => {
        async function fetchGuests() {
            try {
                // Firebase Auth가 완전히 초기화될 때까지 대기
                if (authLoading || !currentParticipant || participantStatus !== 'ready') {
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

                            // 기수 순으로 정렬 (최초 기수부터)
                            const ranked = [...group].sort((a, b) => {
                                return parseCohortNumber(a.cohortId) - parseCohortNumber(b.cohortId);
                            });

                            // 재참여자의 partyPreferredCohortId 확인
                            // 어떤 참가자든 같은 전화번호면 같은 preferredCohortId를 가짐
                            const preferredCohortId = group.find(p => p.partyPreferredCohortId)?.partyPreferredCohortId;
                            let selectedParticipant = ranked[0]; // 기본값: 최초 기수

                            if (preferredCohortId) {
                                // 선호 기수가 설정되어 있으면 해당 기수의 참가자 사용
                                const preferred = ranked.find(p => p.cohortId === preferredCohortId);
                                if (preferred) {
                                    selectedParticipant = preferred;
                                }
                            }

                            return {
                                phone,
                                participant: selectedParticipant,
                                orderIndex: orderIndexByPhone.get(phone) ?? Number.POSITIVE_INFINITY,
                            };
                        })
                        .filter(Boolean) as { phone: string; participant: Participant; orderIndex: number }[];

                    merged.sort((a, b) => a.orderIndex - b.orderIndex);
                    const ordered = merged.map((x) => x.participant);

                    const viewerPhone = normalizePhoneNumber(currentParticipant.phoneNumber);

                    // 현재 사용자의 모든 기수 참가자 정보 저장 (재참여자 프로필북 선택용)
                    const myAllParticipants = viewerPhone ? (groups.get(viewerPhone) ?? []) : [];
                    const sortedMyParticipants = [...myAllParticipants].sort((a, b) =>
                        parseCohortNumber(a.cohortId) - parseCohortNumber(b.cohortId)
                    );
                    setMyAllCohortParticipants(sortedMyParticipants);

                    // 재참여자인지 확인 및 프로필북 선택 처리
                    let selectedParticipant: Participant | null = null;
                    if (sortedMyParticipants.length > 1) {
                        // 재참여자: partyPreferredCohortId 확인
                        const preferredCohortId = currentParticipant.partyPreferredCohortId;
                        if (preferredCohortId) {
                            // 이미 선택됨 → 해당 기수의 참가자 사용
                            selectedParticipant = sortedMyParticipants.find(
                                (p) => p.cohortId === preferredCohortId
                            ) ?? sortedMyParticipants[0];
                        } else {
                            // 아직 선택 안 함 → 모달 표시
                            setShowCohortSelectModal(true);
                            selectedParticipant = sortedMyParticipants[0]; // 임시로 최초 기수
                        }
                    } else if (sortedMyParticipants.length === 1) {
                        selectedParticipant = sortedMyParticipants[0];
                    }
                    setSelectedCohortParticipant(selectedParticipant);

                    const myPartyParticipantId = selectedParticipant?.id ?? null;
                    setHighlightParticipantId(myPartyParticipantId);

                    // ✅ 정렬 정책
                    // - 파티 명단(전화번호)에 포함된 경우에만 "내 프로필북" 고정/표시
                    // - 추가로, 내 프로필북이 속한 '기수(cohortId)'의 멤버들을 우선 노출
                    if (selectedParticipant) {
                        const viewerCohortId = selectedParticipant.cohortId;

                        // 내 프로필북을 리스트에서 선택된 기수로 교체
                        const orderedWithSelectedCohort = ordered.map((p) => {
                            // 같은 전화번호의 다른 기수 참가자면 선택된 기수로 교체
                            if (viewerPhone && normalizePhoneNumber(p.phoneNumber) === viewerPhone) {
                                return selectedParticipant;
                            }
                            return p;
                        });

                        const withoutMe = orderedWithSelectedCohort.filter((p) => p.id !== selectedParticipant.id);
                        const sameCohort = withoutMe.filter((p) => p.cohortId === viewerCohortId);
                        const otherCohort = withoutMe.filter((p) => p.cohortId !== viewerCohortId);

                        setParticipants([selectedParticipant, ...sameCohort, ...otherCohort]);
                        return;
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
    }, [authLoading, currentParticipant, participantStatus]);

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

    // 프로필북 선택 핸들러
    const handleCohortSelect = (participant: Participant) => {
        setSelectedCohortParticipant(participant);
        setHighlightParticipantId(participant.id);
        setShowCohortSelectModal(false);

        // participants 리스트에서 내 프로필북을 선택된 기수로 교체
        setParticipants((prev) => {
            const viewerPhone = normalizePhoneNumber(currentParticipant?.phoneNumber);
            if (!viewerPhone) return prev;

            const updated = prev.map((p) => {
                if (normalizePhoneNumber(p.phoneNumber) === viewerPhone) {
                    return participant;
                }
                return p;
            });

            // 정렬 유지: 내 프로필북 + 같은 기수 + 다른 기수
            const withoutMe = updated.filter((p) => p.id !== participant.id);
            const sameCohort = withoutMe.filter((p) => p.cohortId === participant.cohortId);
            const otherCohort = withoutMe.filter((p) => p.cohortId !== participant.cohortId);

            return [participant, ...sameCohort, ...otherCohort];
        });
    };

    const handleCohortModalClose = () => {
        // 닫기 시 최초 기수로 자동 설정 (CohortSelectModal에서 처리됨)
        setShowCohortSelectModal(false);
    };

    // ARCHIVED: 연말파티 종료 화면
    if (PARTY_ARCHIVED) {
        return (
            <PageTransition>
                <div className="app-shell flex flex-col items-center justify-center min-h-screen bg-[#F6F6F6] p-6">
                    <div className="text-center space-y-4">
                        <div className="text-6xl mb-4">🎄</div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            2025 X-mas 연말파티가 종료되었습니다
                        </h1>
                        <p className="text-gray-600">
                            함께해주셔서 감사합니다!<br />
                            다음 파티에서 만나요 ✨
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.href = '/app'}
                            className="mt-6 px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors"
                        >
                            앱으로 돌아가기
                        </button>
                    </div>
                </div>
            </PageTransition>
        );
    }

    if (isLoading) {
        return <LoadingSkeleton title="2025 X-mas 연말파티" />;
    }

    // 재참여자인지 확인 (프로필북 변경 버튼 표시용)
    const isReParticipant = myAllCohortParticipants.length > 1;

    return (
        <PageTransition>
            <div className="app-shell flex flex-col overflow-hidden bg-[#F6F6F6] min-h-screen">
                <TopBar
                    title="2025 X-mas 연말파티"
                    align="center"
                    className="bg-white border-b-0"
                    leftAction={
                        isReParticipant ? (
                            <button
                                type="button"
                                onClick={() => setShowCohortSelectModal(true)}
                                className="rounded-md px-3 py-2 text-[13px] font-medium text-[#333D4B] hover:bg-gray-100 transition-colors"
                            >
                                프로필북 변경
                            </button>
                        ) : undefined
                    }
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

                <main className="flex-1 overflow-y-auto">
                    <PartyTabs
                        participants={participants}
                        currentUserName={currentParticipant?.name ?? null}
                        highlightParticipantId={highlightParticipantId}
                        onProfileClick={handleProfileClick}
                        errorMessage={errorMessage ?? undefined}
                    />
                </main>
            </div>

            {/* 재참여자 프로필북 선택 모달 */}
            <CohortSelectModal
                isOpen={showCohortSelectModal}
                participants={myAllCohortParticipants}
                currentParticipantId={currentParticipant?.id ?? ''}
                onSelect={handleCohortSelect}
                onClose={handleCohortModalClose}
            />
        </PageTransition>
    );
}
