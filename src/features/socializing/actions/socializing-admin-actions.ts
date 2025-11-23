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
                const dates = Array.isArray(p.socializingVotes.date) 
                    ? p.socializingVotes.date 
                    : [p.socializingVotes.date];
                
                dates.forEach(date => {
                    if (date) {
                        dateVotes[date] = (dateVotes[date] || 0) + 1;
                    }
                });
            }
            if (p.socializingVotes?.location) {
                const locations = Array.isArray(p.socializingVotes.location)
                    ? p.socializingVotes.location
                    : [p.socializingVotes.location];
                
                locations.forEach(location => {
                    if (location) {
                        locationVotes[location] = (locationVotes[location] || 0) + 1;
                    }
                });
            }
        });

        // 2. Determine Winners
        const winningDate = Object.entries(dateVotes).sort((a, b) => b[1] - a[1])[0]?.[0];
        const winningLocation = Object.entries(locationVotes).sort((a, b) => b[1] - a[1])[0]?.[0];

        if (!winningDate || !winningLocation) {
            return { success: false, error: '투표 데이터가 부족합니다.' };
        }

        // 3. Update Cohort Phase to Confirmed and Save Result
        const batch = db.batch();

        const cohortRef = db.collection(COLLECTIONS.COHORTS).doc(cohortId);
        batch.update(cohortRef, {
            socializingPhase: 'confirmed',
            socializingResult: {
                date: winningDate,
                location: winningLocation,
            },
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 4. Batch Process Participants (Optional: Update socializingResult for participants)
        participantsSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                socializingResult: {
                    cohortId: cohortId, // Same cohort
                    date: winningDate,
                    location: winningLocation,
                },
                updatedAt: FieldValue.serverTimestamp(),
            });
        });

        await batch.commit();

        logger.info('Finalized socializing', { cohortId, winningDate, winningLocation });
        return { success: true, winningDate, winningLocation };

    } catch (error) {
        logger.error('Failed to finalize socializing', error);
        return { success: false, error: '매칭 처리 중 오류 발생' };
    }
}
