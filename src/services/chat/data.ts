'use server';

import { cache } from 'react';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import type { Cohort, Notice, Participant } from '@/types/database';

const COLLECTIONS = {
  COHORTS: 'cohorts',
  PARTICIPANTS: 'participants',
  NOTICES: 'notices',
} as const;

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

function mapSnapshot<T>(docs: QueryDocumentSnapshot[]): FirestoreDoc<T>[] {
  return docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...serializeTimestamps(data) } as FirestoreDoc<T>;
  });
}

export const fetchChatParticipants = cache(async (cohortId: string): Promise<Participant[]> => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(COLLECTIONS.PARTICIPANTS)
    .where('cohortId', '==', cohortId)
    .orderBy('createdAt', 'asc')
    .get();

  return mapSnapshot<Participant>(snapshot.docs);
});

export const fetchChatNotices = cache(async (cohortId: string): Promise<Notice[]> => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(COLLECTIONS.NOTICES)
    .where('cohortId', '==', cohortId)
    .orderBy('createdAt', 'asc')
    .get();

  return mapSnapshot<Notice>(snapshot.docs);
});

export const fetchChatCohort = cache(async (cohortId: string): Promise<Cohort | null> => {
  const { db } = getFirebaseAdmin();
  const doc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return { id: doc.id, ...serializeTimestamps(data) } as Cohort;
});

export const fetchChatInitialData = cache(
  async (cohortId: string): Promise<{
    cohort: Cohort | null;
    participants: Participant[];
    notices: Notice[];
  }> => {
    const [cohort, participants, notices] = await Promise.all([
      fetchChatCohort(cohortId),
      fetchChatParticipants(cohortId),
      fetchChatNotices(cohortId),
    ]);

    return {
      cohort,
      participants,
      notices,
    };
  }
);
