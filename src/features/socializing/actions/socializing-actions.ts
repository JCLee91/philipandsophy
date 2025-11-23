'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/types/database';
import type { Participant } from '@/types/database';

export async function voteForDate(cohortId: string, date: string): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // Update participant's vote
        await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).update({
            'socializingVotes.date': date,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('User voted for date', { participantId, cohortId, date });
        return { success: true };

    } catch (error) {
        logger.error('Failed to vote for date', error);
        return { success: false, error: '투표 중 오류가 발생했습니다.' };
    }
}

export async function voteForLocation(cohortId: string, location: string): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // Update participant's vote
        await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).update({
            'socializingVotes.location': location,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('User voted for location', { participantId, cohortId, location });
        return { success: true };

    } catch (error) {
        logger.error('Failed to vote for location', error);
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
            const dVote = data.socializingVotes?.date;
            const lVote = data.socializingVotes?.location;

            if (dVote) {
                dateVotes[dVote] = (dateVotes[dVote] || 0) + 1;
            }
            if (lVote) {
                locationVotes[lVote] = (locationVotes[lVote] || 0) + 1;
            }
        });

        return { dateVotes, locationVotes };

    } catch (error) {
        logger.error('Failed to get socializing stats', error);
        return { dateVotes: {}, locationVotes: {} };
    }
}
