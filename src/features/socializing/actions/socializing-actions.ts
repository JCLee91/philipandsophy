'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/types/database';
import type { Participant } from '@/types/database';

export async function voteForDate(cohortId: string, dates: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // Update participant's vote
        await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).update({
            'socializingVotes.date': dates,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('User voted for dates', { participantId, cohortId, dates });
        return { success: true };

    } catch (error) {
        logger.error('Failed to vote for dates', error);
        return { success: false, error: '투표 중 오류가 발생했습니다.' };
    }
}

export async function voteForLocation(cohortId: string, locations: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // Update participant's vote
        await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).update({
            'socializingVotes.location': locations,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('User voted for locations', { participantId, cohortId, locations });
        return { success: true };

    } catch (error) {
        logger.error('Failed to vote for locations', error);
        return { success: false, error: '투표 중 오류가 발생했습니다.' };
    }
}

export async function getSocializingStats(cohortId: string): Promise<{ dateVotes: Record<string, number>; locationVotes: Record<string, number> }> {
    try {
        const { db } = getFirebaseAdmin();

        // Fetch all participants in the cohort
        const snapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
            .where('cohortId', '==', cohortId)
            .get();

        const dateVotes: Record<string, number> = {};
        const locationVotes: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data() as Participant;
            const dVotes = data.socializingVotes?.date;
            const lVotes = data.socializingVotes?.location;

            // Handle both string (legacy) and array formats
            const dVoteArray = Array.isArray(dVotes) ? dVotes : (dVotes ? [dVotes] : []);
            const lVoteArray = Array.isArray(lVotes) ? lVotes : (lVotes ? [lVotes] : []);

            dVoteArray.forEach(vote => {
                if (vote) dateVotes[vote] = (dateVotes[vote] || 0) + 1;
            });

            lVoteArray.forEach(vote => {
                if (vote) locationVotes[vote] = (locationVotes[vote] || 0) + 1;
            });
        });

        return { dateVotes, locationVotes };

    } catch (error) {
        logger.error('Failed to get socializing stats', error);
        return { dateVotes: {}, locationVotes: {} };
    }
}
