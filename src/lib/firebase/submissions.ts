'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  onSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import { getSubmissionDate } from '@/lib/date-utils';
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
 * 제출물 문서 ID 생성
 * 형식: 참가자이름_MMDD_HHmm (예: 김철수_1129_1330)
 */
function generateSubmissionId(participantName: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  // 이름에서 공백 제거하고 안전한 문자만 사용
  const safeName = participantName.replace(/\s+/g, '').replace(/[\/\\?%*:|"<>]/g, '');
  return `${safeName}_${month}${day}_${hours}${minutes}`;
}

/**
 * 독서 인증 제출
 *
 * 같은 참가자가 같은 날짜에 이미 approved 제출물이 있으면 기존 ID 반환 (중복 방지)
 * 문서 ID 형식: 참가자이름_MMDD_HHmm (예: 김철수_1129_1330)
 */
export async function createSubmission(
  data: Omit<ReadingSubmission, 'id' | 'createdAt' | 'updatedAt' | 'submissionDate'>,
  participantName: string
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();
  const submissionDate = getSubmissionDate(); // 새벽 2시 마감 정책 적용

  // 중복 제출 방지: 같은 날짜에 이미 approved 제출물이 있는지 확인
  const existingQuery = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participantId', '==', data.participantId),
    where('submissionDate', '==', submissionDate),
    where('status', '==', 'approved'),
    limit(1)
  );
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    // 이미 제출됨 - 기존 ID 반환 (중복 생성 방지)
    return existingSnapshot.docs[0].id;
  }

  // 커스텀 ID로 문서 생성
  const customId = generateSubmissionId(participantName);
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, customId);

  await setDoc(docRef, {
    ...data,
    submissionDate,
    createdAt: now,
    updatedAt: now,
  });

  return customId;
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

// ❌ REMOVED: getSubmissionsByCode - 미사용 함수 제거

// ❌ REMOVED: getAllSubmissions - 미사용 함수 제거

// ❌ REMOVED: getSubmissionsByStatus - 미사용 함수 제거

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
  // Firebase throws on error - no need for try-catch
}

/**
 * 제출물 삭제
 */
export async function deleteSubmission(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, id);
  await deleteDoc(docRef);
}

// ❌ REMOVED: searchSubmissions - 미사용 함수 제거

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

      callback(participantIds);
    },
    (error) => {
      // Firebase 에러 처리 (네트워크, 권한 등)

      // 에러 발생 시 빈 Set 반환 (fallback)
      callback(new Set());
    }
  );

  return unsubscribe;
}

/**
 * 임시저장된 제출물 조회 (참가자별)
 */
export async function getDraftSubmission(
  participantId: string,
  cohortId: string
): Promise<ReadingSubmission | null> {
  const db = getDb();

  // 해당 참가자의 오늘 날짜 draft 찾기
  const submissionDate = getSubmissionDate();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participantId', '==', participantId),
    where('status', '==', 'draft'),
    where('submissionDate', '==', submissionDate),
    orderBy('updatedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as ReadingSubmission;
}

/**
 * 임시저장 (새로 생성 또는 업데이트)
 * 문서 ID 형식: 참가자이름_MMDD_HHmm (예: 김철수_1129_1330)
 */
export async function saveDraft(
  participantId: string,
  participationCode: string,
  data: {
    cohortId?: string; // 🆕 기수 ID (중복 참가자 구분용)
    bookImageUrl?: string; // 이미 업로드된 이미지 URL
    bookTitle?: string;
    bookAuthor?: string;
    bookCoverUrl?: string;
    bookDescription?: string;
    review?: string;
    dailyAnswer?: string;
    dailyQuestion?: string;
  },
  participantName?: string
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();
  const submissionDate = getSubmissionDate();

  // 기존 draft 확인 - getDraftSubmission의 두 번째 인자는 사용하지 않지만, 일관성을 위해 cohortId 형태로 전달
  // 실제로는 participantId로 검색하므로 문제 없음
  const existingDraft = await getDraftSubmission(participantId, participationCode);

  const draftData = {
    participantId,
    participationCode,
    cohortId: data.cohortId, // 🆕 cohortId 포함 (제공된 경우)
    ...data,
    submissionDate,
    status: 'draft' as const,
    updatedAt: now,
  };

  if (existingDraft) {
    // 기존 draft 업데이트
    const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, existingDraft.id);
    await updateDoc(docRef, draftData);
    return existingDraft.id;
  } else {
    // 새 draft 생성 - 커스텀 ID 사용
    const customId = participantName
      ? generateSubmissionId(participantName)
      : `draft_${participantId}_${Date.now()}`;
    const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, customId);

    await setDoc(docRef, {
      ...draftData,
      createdAt: now,
    });
    return customId;
  }
}

/**
 * 임시저장 삭제
 */
export async function deleteDraft(draftId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.READING_SUBMISSIONS, draftId);
  await deleteDoc(docRef);
}
