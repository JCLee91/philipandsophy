'use server';

import { cache } from 'react';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import type { Participant, ReadingSubmission, Cohort } from '@/types/database';
import { COLLECTIONS } from '@/types/database';

type FirestoreDoc<T> = T & { id: string };

/**
 * Convert Firestore Timestamps to serializable objects for Client Components
 */
function serializeTimestamps(data: any): any {
  if (data instanceof Timestamp) {
    return { _seconds: data.seconds, _nanoseconds: data.nanoseconds };
  }
  if (Array.isArray(data)) {
    return data.map(serializeTimestamps);
  }
  if (data && typeof data === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeTimestamps(value);
    }
    return serialized;
  }
  return data;
}

function mapSnapshot<T>(docs: FirebaseFirestore.QueryDocumentSnapshot[]): FirestoreDoc<T>[] {
  return docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...serializeTimestamps(data) } as FirestoreDoc<T>;
  });
}

export const fetchProfileInitialData = cache(
  async ({
    participantId,
    viewerId,
    cohortId,
  }: {
    participantId: string;
    viewerId?: string | null;
    cohortId?: string | null;
  }): Promise<{
    participant: Participant | null;
    cohort: Cohort | null;
    participantSubmissions: ReadingSubmission[];
    viewerSubmissions: ReadingSubmission[];
  }> => {
    const { db } = getFirebaseAdmin();

    const participantPromise = db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId).get();
    const cohortPromise = cohortId
      ? db.collection(COLLECTIONS.COHORTS).doc(cohortId).get()
      : Promise.resolve(null);
    const participantSubmissionsPromise = db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .where('participantId', '==', participantId)
      .orderBy('submittedAt', 'desc')
      .get();

    const viewerSubmissionsPromise =
      viewerId && viewerId !== participantId
        ? db
            .collection(COLLECTIONS.READING_SUBMISSIONS)
            .where('participantId', '==', viewerId)
            .orderBy('submittedAt', 'desc')
            .get()
        : Promise.resolve(null);

    const [participantDoc, cohortDoc, participantSubmissionsSnapshot, viewerSubmissionsSnapshot] =
      await Promise.all([participantPromise, cohortPromise, participantSubmissionsPromise, viewerSubmissionsPromise]);

    const participant = participantDoc.exists
      ? ({ id: participantDoc.id, ...serializeTimestamps(participantDoc.data()) } as Participant)
      : null;
    const cohort =
      cohortDoc && cohortDoc.exists
        ? ({ id: cohortDoc.id, ...serializeTimestamps(cohortDoc.data()) } as Cohort)
        : null;

    const participantSubmissions = mapSnapshot<ReadingSubmission>(participantSubmissionsSnapshot.docs);
    const viewerSubmissions =
      viewerSubmissionsSnapshot ? mapSnapshot<ReadingSubmission>(viewerSubmissionsSnapshot.docs) : [];

    return {
      participant,
      cohort,
      participantSubmissions,
      viewerSubmissions,
    };
  }
);
