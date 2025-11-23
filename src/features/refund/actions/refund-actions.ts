'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/types/database';
import type { Cohort, Participant } from '@/types/database';

export async function joinRefundMeetup(date: string, location: string): Promise<{ success: boolean; cohortId?: string; error?: string }> {
    try {
        const cookieStore = await cookies();
        const participantId = cookieStore.get('pns-participant')?.value;

        if (!participantId) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const { db } = getFirebaseAdmin();

        // 1. Get current participant info
        const participantDoc = await db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).get();
        if (!participantDoc.exists) {
            return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
        }
        const participantData = participantDoc.data() as Participant;

        // 2. Check if meetup cohort exists
        const meetupName = `환급 모임 [${date}] ${location}`;
        const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS)
            .where('type', '==', 'meetup')
            .where('meetupDate', '==', date)
            .where('location', '==', location)
            .limit(1)
            .get();

        let cohortId: string;

        if (cohortsSnapshot.empty) {
            // Create new cohort
            const newCohortRef = db.collection(COLLECTIONS.COHORTS).doc();
            cohortId = newCohortRef.id;

            const newCohort: Cohort = {
                id: cohortId,
                name: meetupName,
                startDate: date, // Use meetup date as start date
                endDate: date,   // Single day event
                programStartDate: date,
                isActive: true,
                type: 'meetup',
                location,
                meetupDate: date,
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
            };

            await newCohortRef.set(newCohort);
            logger.info('Created new refund meetup cohort', { cohortId, name: meetupName });
        } else {
            cohortId = cohortsSnapshot.docs[0].id;
        }

        // 3. Check if user is already in this cohort
        // We need to check if there is a participant record for this user in this cohort.
        // Since a user can be in multiple cohorts, we might need to create a NEW participant record 
        // if the system design allows one user to have multiple participant records (one per cohort).
        // Based on `ChatPage.tsx`, it checks `participant.cohortId` OR searches by phoneNumber.

        const existingParticipantSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
            .where('phoneNumber', '==', participantData.phoneNumber)
            .where('cohortId', '==', cohortId)
            .limit(1)
            .get();

        if (existingParticipantSnapshot.empty) {
            // Create new participant record for this meetup
            const newParticipantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc();
            const newParticipant: Participant = {
                ...participantData, // Copy existing data
                id: newParticipantRef.id,
                cohortId: cohortId,
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
                // Reset some fields that shouldn't be copied blindly if they are specific to a cohort context
                // But for now, copying seems safe as most are personal info.
            };

            // Remove fields that might conflict or should be unique per participation if any
            // For now, we keep it simple.

            await newParticipantRef.set(newParticipant);
            logger.info('User joined refund meetup', { userId: participantId, cohortId });
        }

        return { success: true, cohortId };

    } catch (error) {
        logger.error('Failed to join refund meetup', error);
        return { success: false, error: '오류가 발생했습니다. 다시 시도해주세요.' };
    }
}
