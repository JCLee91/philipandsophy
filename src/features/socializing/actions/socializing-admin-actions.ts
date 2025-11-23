'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/types/database';
import type { Cohort, Participant } from '@/types/database';

export async function updateCohortPhase(
    cohortId: string,
    phase: Cohort['socializingPhase'],
    options?: Cohort['socializingOptions']
) {
    try {
        const { db } = getFirebaseAdmin();

        const updateData: any = {
            socializingPhase: phase,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (options) {
            updateData.socializingOptions = options;
        }

        await db.collection(COLLECTIONS.COHORTS).doc(cohortId).update(updateData);

        logger.info('Updated cohort phase', { cohortId, phase });
        return { success: true };
    } catch (error) {
        logger.error('Failed to update cohort phase', error);
        return { success: false, error: '상태 업데이트 실패' };
    }
}

export async function finalizeSocializing(cohortId: string) {
    try {
        const { db } = getFirebaseAdmin();

        // 1. Get Vote Stats
        const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
            .where('cohortId', '==', cohortId)
            .get();

        const dateVotes: Record<string, number> = {};
        const locationVotes: Record<string, number> = {};

        participantsSnapshot.docs.forEach(doc => {
            const p = doc.data() as Participant;
            if (p.socializingVotes?.date) {
                dateVotes[p.socializingVotes.date] = (dateVotes[p.socializingVotes.date] || 0) + 1;
            }
            if (p.socializingVotes?.location) {
                locationVotes[p.socializingVotes.location] = (locationVotes[p.socializingVotes.location] || 0) + 1;
            }
        });

        // 2. Determine Winners
        const winningDate = Object.entries(dateVotes).sort((a, b) => b[1] - a[1])[0]?.[0];
        const winningLocation = Object.entries(locationVotes).sort((a, b) => b[1] - a[1])[0]?.[0];

        if (!winningDate || !winningLocation) {
            return { success: false, error: '투표 데이터가 부족합니다.' };
        }

        // 3. Create Meetup Cohort
        const meetupName = `환급 모임 (${winningDate} ${winningLocation})`;
        const newCohortRef = db.collection(COLLECTIONS.COHORTS).doc();
        const newCohortId = newCohortRef.id;

        const newCohortData: Cohort = {
            id: newCohortId,
            name: meetupName,
            startDate: winningDate,
            endDate: winningDate,
            programStartDate: winningDate,
            isActive: true,
            createdAt: Timestamp.now() as any,
            updatedAt: Timestamp.now() as any,
            type: 'meetup',
            location: winningLocation,
            meetupDate: winningDate,
        };

        await newCohortRef.set(newCohortData);

        // 4. Batch Process Participants
        const batch = db.batch();

        participantsSnapshot.docs.forEach(doc => {
            const p = doc.data() as Participant;

            // A. Add to new cohort
            const newParticipantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc();
            const newParticipantData: Participant = {
                ...p,
                id: newParticipantRef.id,
                cohortId: newCohortId,
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
                // Clear socializing data for the new record
                socializingVotes: undefined,
                socializingResult: undefined,
            };
            batch.set(newParticipantRef, newParticipantData);

            // B. Update original participant with result
            batch.update(doc.ref, {
                socializingResult: {
                    cohortId: newCohortId,
                    date: winningDate,
                    location: winningLocation,
                },
                updatedAt: FieldValue.serverTimestamp(),
            });
        });

        // 5. Update Cohort Phase to Confirmed
        batch.update(db.collection(COLLECTIONS.COHORTS).doc(cohortId), {
            socializingPhase: 'confirmed',
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        logger.info('Finalized socializing', { cohortId, newCohortId, winningDate, winningLocation });
        return { success: true, winningDate, winningLocation };

    } catch (error) {
        logger.error('Failed to finalize socializing', error);
        return { success: false, error: '매칭 처리 중 오류 발생' };
    }
}
