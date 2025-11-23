'use client';

import { useMemo } from 'react';
import type { Cohort, Participant } from '@/types/database';
import DateVotingCard from './DateVotingCard';
import LocationVotingCard from './LocationVotingCard';
import ConfirmedCard from './ConfirmedCard';

interface SocializingDashboardProps {
    cohort: Cohort;
    participant: Participant;
    voteStats: {
        dateVotes: Record<string, number>;
        locationVotes: Record<string, number>;
    };
}

export default function SocializingDashboard({
    cohort,
    participant,
    voteStats
}: SocializingDashboardProps) {

    const phase = cohort.socializingPhase || 'idle';

    if (phase === 'date_vote') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2 mb-8">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        Phase 1. 날짜 정하기
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900">
                        우리 언제 만날까요?
                    </h2>
                    <p className="text-gray-600">
                        가장 많은 동기들이 선택한 날짜에<br />
                        뒷풀이 모임이 열립니다!
                    </p>
                </div>

                <DateVotingCard
                    cohortId={cohort.id}
                    availableDates={cohort.socializingOptions?.dates || []}
                    currentVote={participant.socializingVotes?.date}
                    voteStats={voteStats.dateVotes}
                />
            </div>
        );
    }

    if (phase === 'location_vote') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2 mb-8">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        Phase 2. 장소 정하기
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900">
                        어디서 만날까요?
                    </h2>
                    <p className="text-gray-600">
                        가장 많은 동기들이 선택한 장소에서<br />
                        모임이 진행됩니다!
                    </p>
                </div>

                <LocationVotingCard
                    cohortId={cohort.id}
                    availableLocations={cohort.socializingOptions?.locations || []}
                    currentVote={participant.socializingVotes?.location}
                    voteStats={voteStats.locationVotes}
                />
            </div>
        );
    }

    if (phase === 'confirmed') {
        if (!participant.socializingResult) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">모임 배정 중...</h2>
                    <p className="text-gray-500">잠시만 기다려주세요.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2 mb-8">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                        Phase 3. 모임 확정
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900">
                        모임 준비 완료!
                    </h2>
                </div>

                <ConfirmedCard result={participant.socializingResult} />
            </div>
        );
    }

    return null;
}
