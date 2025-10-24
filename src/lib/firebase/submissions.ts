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
  QuerySnapshot,
} from 'firebase/firestore';
import { getTodayString } from '@/lib/date-utils';
import { getDb } from './client';
import { ReadingSubmission, COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * Reading Submission CRUD Operations
 */

/**
 * Firestore QuerySnapshot을 ReadingSubmission 배열로 변환
 */
function mapToSubmissions(querySnapshot: QuerySnapshot): ReadingSubmission[] {
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReadingSubmission[];
}

/**
 * 독서 인증 제출
 */
export async function createSubmission(
  data: Omit<ReadingSubmission, 'id' | 'createdAt' | 'updatedAt' | 'submissionDate'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();
  const submissionDate = getTodayString(); // KST 타임존 사용

  console.log('🔍 [createSubmission] 제출 생성:', {
    submissionDate,
    participantId: data.participantId,
    status: data.status
  });

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
  return mapToSubmissions(querySnapshot);
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
  return mapToSubmissions(querySnapshot);
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
  return mapToSubmissions(querySnapshot);
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
  return mapToSubmissions(querySnapshot);
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
  return mapToSubmissions(querySnapshot);
}

/**
 * 참가자별 제출물 실시간 구독 (프로필북용)
 * @param participantId - 참가자 ID
 * @param callback - 제출물 배열을 받는 콜백 함수
 * @returns unsubscribe 함수
 */
export function subscribeParticipantSubmissions(
  participantId: string,
  callback: (submissions: ReadingSubmission[]) => void
): () => void {
  const db = getDb();

  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participantId', '==', participantId),
    orderBy('submittedAt', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const submissions = mapToSubmissions(snapshot);
      callback(submissions);
    },
    (error) => {
      logger.error('Firebase 실시간 구독 에러:', error);
      callback([]); // 에러 시 빈 배열
    }
  );

  return unsubscribe;
}

/**
 * 오늘 인증한 참가자 실시간 구독
 * @param callback - 참가자 ID Set을 받는 콜백 함수
 * @param targetDate - 조회할 날짜 (yyyy-MM-dd 형식), 필수
 */
export function subscribeTodayVerified(
  callback: (participantIds: Set<string>) => void,
  targetDate: string
): () => void {
  const db = getDb();

  console.log('🔍 [subscribeTodayVerified] 쿼리 시작:', {
    targetDate,
    collection: COLLECTIONS.READING_SUBMISSIONS,
    statusFilter: ['pending', 'approved']
  });

  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('submissionDate', '==', targetDate),
    where('status', 'in', ['pending', 'approved'])
  );

  // 에러 핸들러 포함한 실시간 구독
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const participantIds = new Set<string>();
      const submissions: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        participantIds.add(data.participantId);
        submissions.push({
          id: doc.id,
          participantId: data.participantId,
          submissionDate: data.submissionDate,
          status: data.status
        });
      });

      console.log('🔍 [subscribeTodayVerified] 결과:', {
        targetDate,
        count: participantIds.size,
        participantIds: Array.from(participantIds),
        submissions
      });

      callback(participantIds);
    },
    (error) => {
      // Firebase 에러 처리 (네트워크, 권한 등)
      console.error('🔍 [subscribeTodayVerified] Firebase 에러:', error);
      logger.error('Firebase 실시간 구독 에러:', error);
      // 에러 발생 시 빈 Set 반환 (fallback)
      callback(new Set());
    }
  );

  return unsubscribe;
}
