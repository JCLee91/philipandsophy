'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/types/database';
import type { Participant, Cohort } from '@/types/database';

/**
 * 1차 투표: 선택지 투표 (복수 선택 가능, 불참은 단독)
 */
export async function voteForOptions(
    cohortId: string,
    optionIds: string[],
    cantAttend: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // Update participant's vote
        await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).update({
            'socializingVotes.optionIds': cantAttend ? [] : optionIds,
            'socializingVotes.cantAttend': cantAttend,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('User voted for options', { participantId, cohortId, optionIds, cantAttend });
        return { success: true };

    } catch (error) {
        logger.error('Failed to vote for options', error);
        return { success: false, error: '투표 중 오류가 발생했습니다.' };
    }
}

/**
 * 2차 투표: 참석 여부 투표
 */
export async function voteAttendance(
    cohortId: string,
    attendance: 'attending' | 'not_attending'
): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // Update participant's attendance
        await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).update({
            'socializingVotes.attendance': attendance,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('User voted attendance', { participantId, cohortId, attendance });
        return { success: true };

    } catch (error) {
        logger.error('Failed to vote attendance', error);
        return { success: false, error: '참불 투표 중 오류가 발생했습니다.' };
    }
}

/**
 * 투표자 프로필 정보
 */
export interface VoterInfo {
    id: string;
    name: string;
    profileImageCircle?: string;
}

/**
 * 소셜링 통계 조회 (조합별 득표수 + 투표자 정보 + 참불 현황)
 */
export async function getSocializingStats(cohortId: string): Promise<{
    optionVotes: Record<string, number>;  // optionId -> 득표수
    optionVoters: Record<string, VoterInfo[]>;  // optionId -> 투표자 정보
    cantAttendCount: number;              // 불참 선택자 수
    cantAttendVoters: VoterInfo[];        // 불참 선택자 정보
    attendanceStats: {
        attending: number;
        notAttending: number;
        attendingVoters: VoterInfo[];
        notAttendingVoters: VoterInfo[];
    };
}> {
    try {
        const { db } = getFirebaseAdmin();

        // Fetch all participants in the cohort
        const snapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
            .where('cohortId', '==', cohortId)
            .get();

        const optionVotes: Record<string, number> = {};
        const optionVoters: Record<string, VoterInfo[]> = {};
        let cantAttendCount = 0;
        const cantAttendVoters: VoterInfo[] = [];
        let attendingCount = 0;
        let notAttendingCount = 0;
        const attendingVoters: VoterInfo[] = [];
        const notAttendingVoters: VoterInfo[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data() as Participant;
            const votes = data.socializingVotes;

            const voterInfo: VoterInfo = {
                id: doc.id,
                name: data.name,
                profileImageCircle: data.profileImageCircle,
            };

            // 1차 투표 집계 (복수 선택)
            if (votes?.cantAttend) {
                cantAttendCount++;
                cantAttendVoters.push(voterInfo);
            } else if (votes?.optionIds && votes.optionIds.length > 0) {
                votes.optionIds.forEach(optionId => {
                    optionVotes[optionId] = (optionVotes[optionId] || 0) + 1;
                    if (!optionVoters[optionId]) {
                        optionVoters[optionId] = [];
                    }
                    optionVoters[optionId].push(voterInfo);
                });
            }

            // 2차 투표 집계
            if (votes?.attendance === 'attending') {
                attendingCount++;
                attendingVoters.push(voterInfo);
            } else if (votes?.attendance === 'not_attending') {
                notAttendingCount++;
                notAttendingVoters.push(voterInfo);
            }
        });

        return {
            optionVotes,
            optionVoters,
            cantAttendCount,
            cantAttendVoters,
            attendanceStats: {
                attending: attendingCount,
                notAttending: notAttendingCount,
                attendingVoters,
                notAttendingVoters,
            },
        };

    } catch (error) {
        logger.error('Failed to get socializing stats', error);
        return {
            optionVotes: {},
            optionVoters: {},
            cantAttendCount: 0,
            cantAttendVoters: [],
            attendanceStats: { attending: 0, notAttending: 0, attendingVoters: [], notAttendingVoters: [] },
        };
    }
}
