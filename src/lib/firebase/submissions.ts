'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  onSnapshot,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { getDb } from './client';
import { ReadingSubmission, COLLECTIONS } from '@/types/database';

/**
 * Reading Submission CRUD Operations
 */

/**
 * 독서 인증 제출
 */
export async function createSubmission(
  data: Omit<ReadingSubmission, 'id' | 'createdAt' | 'updatedAt' | 'submissionDate'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();
  const submissionDate = format(now.toDate(), 'yyyy-MM-dd');

  const docRef = await addDoc(collection(db, COLLECTIONS.READING_SUBMISSIONS), {
    ...data,
    submissionDate,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * 제출물 조회 (ID로)
 */
export async function getSubmissionById(
  id: string
): Promise<ReadingSubmission | null> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as ReadingSubmission;
}

/**
 * 참가자별 제출물 조회
 */
export async function getSubmissionsByParticipant(
  participantId: string
): Promise<ReadingSubmission[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participantId', '==', participantId),
    orderBy('submittedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 참여코드별 제출물 조회
 */
export async function getSubmissionsByCode(
  participationCode: string
): Promise<ReadingSubmission[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participationCode', '==', participationCode),
    orderBy('submittedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 모든 제출물 조회
 */
export async function getAllSubmissions(): Promise<ReadingSubmission[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    orderBy('submittedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 제출물 상태별 조회
 */
export async function getSubmissionsByStatus(
  status: 'pending' | 'approved' | 'rejected'
): Promise<ReadingSubmission[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('status', '==', status),
    orderBy('submittedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 제출물 업데이트
 */
export async function updateSubmission(
  id: string,
  data: Partial<Omit<ReadingSubmission, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, id);

  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 제출물 승인 상태 업데이트
 */
export async function updateSubmissionStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  reviewNote?: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, id);

  await updateDoc(docRef, {
    status,
    reviewNote,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 제출물 삭제
 */
export async function deleteSubmission(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, id);
  await deleteDoc(docRef);
}

/**
 * 제출물 검색 (커스텀 쿼리)
 */
export async function searchSubmissions(
  constraints: QueryConstraint[]
): Promise<ReadingSubmission[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTIONS.READING_SUBMISSIONS), ...constraints);

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 참가자별 승인된 제출물만 조회 (프로필북용)
 */
export async function getApprovedSubmissionsByParticipant(
  participantId: string
): Promise<ReadingSubmission[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participantId', '==', participantId),
    where('status', '==', 'approved'),
    orderBy('submittedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 오늘 인증한 참가자 실시간 구독
 */
export function subscribeTodayVerified(
  callback: (participantIds: Set<string>) => void
): () => void {
  const db = getDb();
  const today = format(new Date(), 'yyyy-MM-dd');

  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('submissionDate', '==', today),
    where('status', 'in', ['pending', 'approved'])
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const participantIds = new Set<string>();
    snapshot.forEach((doc) => {
      participantIds.add(doc.data().participantId);
    });
    callback(participantIds);
  });

  return unsubscribe;
}
