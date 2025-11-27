'use client';

import { useState, useEffect } from 'react';
import type { Cohort, Participant } from '@/types/database';
import type { VoterInfo } from '@/features/socializing/actions/socializing-actions';
import AfterDiningIntroCard from './AfterDiningIntroCard';
import OptionVotingCard from './OptionVotingCard';
import AttendanceCheckCard from './AttendanceCheckCard';
import ConfirmedCard from './ConfirmedCard';

interface SocializingDashboardProps {
    cohort: Cohort;
    participant: Participant;
    voteStats: {
        optionVotes: Record<string, number>;
        optionVoters: Record<string, VoterInfo[]>;
        cantAttendCount: number;
        cantAttendVoters: VoterInfo[];
        attendanceStats: {
            attending: number;
            notAttending: number;
            attendingVoters: VoterInfo[];
            notAttendingVoters: VoterInfo[];
        };
    };
    onRefresh?: () => Promise<void>;
    realtimeUserVotes?: Participant['socializingVotes'];
    onExit?: () => void;
}

export default function SocializingDashboard({
    cohort,
    participant,
    voteStats,
    onRefresh,
    realtimeUserVotes,
    onExit
}: SocializingDashboardProps) {
    // 실시간 유저 투표 상태가 있으면 우선 사용, 없으면 participant에서 가져옴
    const userVotes = realtimeUserVotes ?? participant.socializingVotes;

    const phase = cohort.socializingPhase || 'idle';

    // 소셜링이 초기화되거나 유효하지 않은 상태일 때 메인으로 이동
    useEffect(() => {
        if (phase === 'idle' || !phase) {
            onExit?.();
        }
    }, [phase, onExit]);

    // 인트로 화면 표시 여부
    const hasVoted = (userVotes?.optionIds && userVotes.optionIds.length > 0) || userVotes?.cantAttend;
    const [hasSeenIntro, setHasSeenIntro] = useState(false);

    // 투표하지 않았고 아직 인트로를 본 적 없으면 인트로 표시
    const showIntro = !hasVoted && !hasSeenIntro;

    // Phase 1: 선택지 투표
    if (phase === 'option_vote') {
        // 인트로 화면
        if (showIntro) {
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center space-y-2 mb-6">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs font-bold border border-gray-200">
                            애프터 다이닝
                        </span>
                        <h2 className="text-heading-xl font-bold text-text-primary">
                            다시 만날 준비 되셨나요?
                        </h2>
                    </div>

                    <AfterDiningIntroCard onNext={() => setHasSeenIntro(true)} />
                </div>
            );
        }

        // 투표 화면
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2 mb-6">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs font-bold border border-gray-200">
                        Step 1. 일정 선택
                    </span>
                    <h2 className="text-heading-xl font-bold text-text-primary">
                        언제 만날까요?
                    </h2>
                    <p className="text-text-secondary">
                        가장 많은 동기들이 선택한 일정으로<br />
                        애프터 다이닝이 진행됩니다!
                    </p>
                </div>

                <OptionVotingCard
                    cohortId={cohort.id}
                    combinations={cohort.socializingOptions?.combinations || []}
                    currentVotes={userVotes?.optionIds || []}
                    currentCantAttend={userVotes?.cantAttend || false}
                    voteStats={voteStats.optionVotes}
                    optionVoters={voteStats.optionVoters}
                    cantAttendCount={voteStats.cantAttendCount}
                    cantAttendVoters={voteStats.cantAttendVoters}
                    deadline={cohort.socializingDeadline}
                    onRefresh={onRefresh}
                />
            </div>
        );
    }

    // Phase 2: 참불 조사
    if (phase === 'attendance_check') {
        if (!cohort.socializingResult) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">참불 조사 준비 중...</h2>
                    <p className="text-gray-500">잠시만 기다려주세요.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2 mb-6">
                    <span className="inline-block px-3 py-1 bg-gray-900 text-white rounded-full text-xs font-bold">
                        Step 2. 참석 확인
                    </span>
                    <h2 className="text-heading-xl font-bold text-text-primary">
                        참석하시나요?
                    </h2>
                    <p className="text-text-secondary">
                        일정이 확정되었습니다!<br />
                        참석 여부를 알려주세요.
                    </p>
                </div>

                <AttendanceCheckCard
                    cohortId={cohort.id}
                    result={cohort.socializingResult}
                    currentVote={userVotes?.attendance}
                    attendanceStats={voteStats.attendanceStats}
                    deadline={cohort.socializingDeadline}
                    onRefresh={onRefresh}
                />
            </div>
        );
    }

    // Phase 3: 확정
    if (phase === 'confirmed') {
        if (!cohort.socializingResult) return null;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ConfirmedCard
                    result={cohort.socializingResult}
                    attendingVoters={voteStats.attendanceStats.attendingVoters}
                    openChatUrl={cohort.socializingOpenChatUrl}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
            <div className="text-gray-500">
                <p>애프터 다이닝 상태를 확인하는 중입니다...</p>
            </div>
            <div className="text-xs text-gray-400 font-mono bg-gray-100 p-3 rounded-lg text-left">
                <p><strong>Debug Info:</strong></p>
                <p>Phase: {String(phase)}</p>
                <p>CohortID: {cohort.id}</p>
                <p>Options: {cohort.socializingOptions?.combinations?.length || 0}</p>
            </div>
        </div>
    );
}
