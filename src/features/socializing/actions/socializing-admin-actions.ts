'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/types/database';
import type { Cohort, Participant } from '@/types/database';

/**
 * 코호트 소셜링 Phase 업데이트
 */
export async function updateCohortPhase(
    cohortId: string,
    phase: Cohort['socializingPhase'],
    options?: Cohort['socializingOptions'],
    deadline?: string  // ISO 8601 형식 마감 시간
) {
    try {
        const { db } = getFirebaseAdmin();

        const updateData: Record<string, unknown> = {
            socializingPhase: phase,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (options) {
            updateData.socializingOptions = options;
        }

        if (deadline) {
            updateData.socializingDeadline = deadline;
        }

        await db.collection(COLLECTIONS.COHORTS).doc(cohortId).update(updateData);

        logger.info('Updated cohort phase', { cohortId, phase, deadline });
        return { success: true };
    } catch (error) {
        logger.error('Failed to update cohort phase', error);
        return { success: false, error: '상태 업데이트 실패' };
    }
}

/**
 * 소셜링 초기화 (모든 투표 데이터 삭제)
 */
export async function resetSocializing(cohortId: string) {
    try {
        const { db } = getFirebaseAdmin();

        // 1. Reset cohort phase and clear options/result/deadline
        await db.collection(COLLECTIONS.COHORTS).doc(cohortId).update({
            socializingPhase: 'idle',
            socializingOptions: FieldValue.delete(),
            socializingResult: FieldValue.delete(),
            socializingDeadline: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 2. Clear all participants' voting data
        const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
            .where('cohortId', '==', cohortId)
            .get();

        // Process in chunks of 499 to avoid batch limit
        const BATCH_SIZE = 499;
        const docs = participantsSnapshot.docs;

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const chunk = docs.slice(i, i + BATCH_SIZE);
            const batch = db.batch();

            chunk.forEach(doc => {
                batch.update(doc.ref, {
                    socializingVotes: FieldValue.delete(),
                    socializingResult: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });

            await batch.commit();
        }

        logger.info('Reset socializing', { cohortId, participantCount: docs.length });
        return { success: true };

    } catch (error) {
        logger.error('Failed to reset socializing', error);
        return { success: false, error: '초기화 중 오류 발생' };
    }
}

/**
 * 1차 투표 종료 → 참불 조사 시작 (최다득표 선택지 선정)
 * 복수 선택 기반: 각 옵션별로 선택한 사람 수를 카운트
 * manualWinningOptionId가 제공되면 해당 옵션을 우승자로 선정
 */
export async function startAttendanceCheck(cohortId: string, deadline?: string, manualWinningOptionId?: string) {
    try {
        const { db } = getFirebaseAdmin();

        // 1. Get cohort options
        const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
        const cohort = cohortDoc.data() as Cohort;

        if (!cohort.socializingOptions?.combinations?.length) {
            return { success: false, error: '선택지가 없습니다.' };
        }

        let winningOptionId = manualWinningOptionId;

        // 2. Get Vote Stats (if no manual selection)
        if (!winningOptionId) {
            const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
                .where('cohortId', '==', cohortId)
                .get();

            const optionVotes: Record<string, number> = {};

            participantsSnapshot.docs.forEach(doc => {
                const p = doc.data() as Participant;
                const votes = p.socializingVotes;

                // 불참이 아니고 optionIds가 있는 경우
                if (!votes?.cantAttend && votes?.optionIds && votes.optionIds.length > 0) {
                    votes.optionIds.forEach(optionId => {
                        optionVotes[optionId] = (optionVotes[optionId] || 0) + 1;
                    });
                }
            });

            // 3. Determine Winner
            const sorted = Object.entries(optionVotes).sort((a, b) => b[1] - a[1]);
            winningOptionId = sorted[0]?.[0];
        }

        if (!winningOptionId) {
            return { success: false, error: '투표 데이터가 부족합니다. 1위 선택지를 찾을 수 없습니다.' };
        }

        const winningOption = cohort.socializingOptions.combinations.find(c => c.id === winningOptionId);

        if (!winningOption) {
            return { success: false, error: '선택지를 찾을 수 없습니다.' };
        }

        // 4. Update Cohort to attendance_check phase with preliminary result
        const updateData: Record<string, unknown> = {
            socializingPhase: 'attendance_check',
            socializingResult: {
                optionId: winningOptionId,
                date: winningOption.date,
                time: winningOption.time,
                location: winningOption.location,
                attendees: [],
                absentees: [],
            },
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (deadline) {
            updateData.socializingDeadline = deadline;
        }

        await db.collection(COLLECTIONS.COHORTS).doc(cohortId).update(updateData);

        logger.info('Started attendance check', { cohortId, winningOptionId, winningOption, deadline });
        return { success: true, winningOption };

    } catch (error) {
        logger.error('Failed to start attendance check', error);
        return { success: false, error: '참불 조사 시작 중 오류 발생' };
    }
}

/**
 * 참불 조사 종료 → 최종 확정 (참석자/불참자 집계)
 */
export async function confirmSocializing(cohortId: string) {
    try {
        const { db } = getFirebaseAdmin();

        // 1. Get cohort current result
        const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
        const cohort = cohortDoc.data() as Cohort;

        if (!cohort.socializingResult) {
            return { success: false, error: '확정 유력 선택지가 없습니다.' };
        }

        // 2. Collect attendance votes
        const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
            .where('cohortId', '==', cohortId)
            .get();

        const attendees: string[] = [];
        const absentees: string[] = [];

        participantsSnapshot.docs.forEach(doc => {
            const p = doc.data() as Participant;
            const attendance = p.socializingVotes?.attendance;

            if (attendance === 'attending') {
                attendees.push(doc.id);
            } else if (attendance === 'not_attending') {
                absentees.push(doc.id);
            }
        });

        // 3. Update Cohort to confirmed with final attendees/absentees
        const batch = db.batch();

        const cohortRef = db.collection(COLLECTIONS.COHORTS).doc(cohortId);
        batch.update(cohortRef, {
            socializingPhase: 'confirmed',
            'socializingResult.attendees': attendees,
            'socializingResult.absentees': absentees,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 4. Update participants with final result
        const BATCH_SIZE = 498; // Leave room for cohort update
        const docs = participantsSnapshot.docs;

        // First batch includes cohort update
        const firstChunk = docs.slice(0, BATCH_SIZE);
        firstChunk.forEach(doc => {
            batch.update(doc.ref, {
                socializingResult: {
                    cohortId: cohortId,
                    optionId: cohort.socializingResult!.optionId,
                    date: cohort.socializingResult!.date,
                    time: cohort.socializingResult!.time,
                    location: cohort.socializingResult!.location,
                },
                updatedAt: FieldValue.serverTimestamp(),
            });
        });

        await batch.commit();

        // Process remaining chunks
        for (let i = BATCH_SIZE; i < docs.length; i += 499) {
            const chunk = docs.slice(i, i + 499);
            const batchN = db.batch();

            chunk.forEach(doc => {
                batchN.update(doc.ref, {
                    socializingResult: {
                        cohortId: cohortId,
                        optionId: cohort.socializingResult!.optionId,
                        date: cohort.socializingResult!.date,
                        time: cohort.socializingResult!.time,
                        location: cohort.socializingResult!.location,
                    },
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });

            await batchN.commit();
        }

        logger.info('Confirmed socializing', {
            cohortId,
            attendeeCount: attendees.length,
            absenteeCount: absentees.length,
        });

        return {
            success: true,
            attendeeCount: attendees.length,
            absenteeCount: absentees.length,
        };

    } catch (error) {
        logger.error('Failed to confirm socializing', error);
        return { success: false, error: '모임 확정 중 오류 발생' };
    }
}

/**
 * 오픈카톡방 URL 업데이트
 */
export async function updateSocializingUrl(cohortId: string, url: string | null) {
    try {
        const { db } = getFirebaseAdmin();

        await db.collection(COLLECTIONS.COHORTS).doc(cohortId).update({
            socializingOpenChatUrl: url,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Updated socializing open chat url', { cohortId, url });
        return { success: true };
    } catch (error) {
        logger.error('Failed to update socializing open chat url', error);
        return { success: false, error: 'URL 업데이트 실패' };
    }
}

