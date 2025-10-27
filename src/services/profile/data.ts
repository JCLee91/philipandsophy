'use server';

import { cache } from 'react';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import type { Participant, ReadingSubmission, Cohort } from '@/types/database';
import { COLLECTIONS } from '@/types/database';

type FirestoreDoc<T> = T & { id: string };

function mapSnapshot<T>(docs: FirebaseFirestore.QueryDocumentSnapshot[]): FirestoreDoc<T>[] {
  return docs.map((doc) => ({ id: doc.id, ...(doc.data() as T) }));
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

    const participant = participantDoc.exists ? ({ id: participantDoc.id, ...(participantDoc.data() as Participant) }) : null;
    const cohort =
      cohortDoc && cohortDoc.exists ? ({ id: cohortDoc.id, ...(cohortDoc.data() as Cohort) }) : null;

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
