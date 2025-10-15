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
  runTransaction,
  deleteField,
} from 'firebase/firestore';
import { getDb } from './client';
import { logger } from '@/lib/logger';
import { Participant, BookHistoryEntry, COLLECTIONS } from '@/types/database';

/**
 * Participant CRUD Operations
 */

/**
 * 참가자 생성
 */
export async function createParticipant(
  data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();

  const docRef = await addDoc(collection(db, COLLECTIONS.PARTICIPANTS), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * 참가자 조회 (ID로)
 */
export async function getParticipantById(
  id: string
): Promise<Participant | null> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Participant;
}

/**
 * 참가자 조회 (전화번호로)
 */
export async function getParticipantByPhoneNumber(
  phoneNumber: string
): Promise<Participant | null> {
  const db = getDb();
  // 하이픈 제거
  const cleanNumber = phoneNumber.replace(/-/g, '');
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('phoneNumber', '==', cleanNumber)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Participant;
}

/**
 * 기수별 참가자 조회
 *
 * 심플하고 직관적인 방식: 네트워크에서 직접 가져오기
 * 참가자 리스트는 항상 완전한 데이터가 필요하므로 캐시 전략을 사용하지 않음
 */
export async function getParticipantsByCohort(
  cohortId: string
): Promise<Participant[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('cohortId', '==', cohortId),
    orderBy('createdAt', 'asc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Participant[];
}

/**
 * 모든 참가자 조회
 */
export async function getAllParticipants(): Promise<Participant[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Participant[];
}

/**
 * 참가자 정보 업데이트
 */
export async function updateParticipant(
  id: string,
  data: Partial<Omit<Participant, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, id);

  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 참가자 삭제
 */
export async function deleteParticipant(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, id);
  await deleteDoc(docRef);
}

/**
 * 참가자 검색 (커스텀 쿼리)
 */
export async function searchParticipants(
  constraints: QueryConstraint[]
): Promise<Participant[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTIONS.PARTICIPANTS), ...constraints);

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Participant[];
}

/**
 * 참가자의 책 정보 업데이트 (책 변경 감지 및 이력 관리)
 *
 * @param participantId - 참가자 ID
 * @param newBookTitle - 새로운 책 제목
 * @param newBookAuthor - 새로운 책 저자 (선택)
 * @param newBookCoverUrl - 새로운 책 표지 URL (선택)
 * @returns void
 *
 * 동작:
 * 1. 현재 책 제목과 새 책 제목이 같으면 메타데이터만 업데이트
 * 2. 다르면:
 *    - 이전 책의 endedAt을 현재 시각으로 설정
 *    - 새 책을 bookHistory에 추가 (endedAt: null)
 *    - currentBookTitle, currentBookAuthor, currentBookCoverUrl 업데이트
 */
export async function updateParticipantBookInfo(
  participantId: string,
  newBookTitle: string,
  newBookAuthor?: string,
  newBookCoverUrl?: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // Use transaction for atomic read-modify-write
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);

        if (!docSnap.exists()) {
          throw new Error('Participant not found');
        }

        const participant = docSnap.data() as Participant;
        const currentBookTitle = participant.currentBookTitle;

        // Validate bookHistory is an array
        const bookHistory = Array.isArray(participant.bookHistory)
          ? participant.bookHistory
          : [];

        const now = Timestamp.now();
        let updatedHistory = [...bookHistory];

        // 책 제목이 같으면 메타데이터만 업데이트
        if (currentBookTitle === newBookTitle) {
          transaction.update(docRef, {
            currentBookAuthor: newBookAuthor || undefined,
            currentBookCoverUrl: newBookCoverUrl || undefined,
            updatedAt: now,
          });
          return;
        }

        // 이전 책이 있으면 종료 처리
        if (currentBookTitle) {
          // 마지막 책 이력의 endedAt 업데이트
          updatedHistory = updatedHistory.map((entry, index) => {
            // 마지막 항목이고 endedAt이 null이면 종료 시각 설정
            if (index === updatedHistory.length - 1 && entry.endedAt === null) {
              return {
                ...entry,
                endedAt: now,
              };
            }
            return entry;
          });
        }

        // 새 책 이력 추가
        const newEntry: BookHistoryEntry = {
          title: newBookTitle,
          startedAt: now,
          endedAt: null, // 현재 읽는 중
        };
        updatedHistory.push(newEntry);

        // Firestore 업데이트 (제목 + 메타데이터)
        transaction.update(docRef, {
          currentBookTitle: newBookTitle,
          currentBookAuthor: newBookAuthor || undefined,
          currentBookCoverUrl: newBookCoverUrl || undefined,
          bookHistory: updatedHistory,
          updatedAt: now,
        });
      });

      return; // Success - exit function
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        logger.error('updateParticipantBookInfo failed after retries:', error);
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
    }
  }
}

/**
 * Firebase UID로 Participant 조회
 *
 * @param firebaseUid - Firebase Auth UID
 * @returns Participant 또는 null
 *
 * @example
 * ```tsx
 * const participant = await getParticipantByFirebaseUid('xyz789firebase');
 * if (participant) {
 *   console.log('참가자:', participant.name);
 * }
 * ```
 */
export async function getParticipantByFirebaseUid(
  firebaseUid: string
): Promise<Participant | null> {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.PARTICIPANTS),
      where('firebaseUid', '==', firebaseUid)
    );

    logger.info('[getParticipantByFirebaseUid] Firestore 쿼리 시작', { firebaseUid });
    const querySnapshot = await getDocs(q);
    logger.info('[getParticipantByFirebaseUid] Firestore 쿼리 완료', {
      firebaseUid,
      empty: querySnapshot.empty,
      size: querySnapshot.size
    });

    if (querySnapshot.empty) {
      logger.warn('[getParticipantByFirebaseUid] Firebase UID로 참가자 없음', { firebaseUid });
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const participant = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Participant;

    logger.info('[getParticipantByFirebaseUid] Firebase UID로 참가자 조회 완료', {
      firebaseUid,
      participantId: participant.id,
      name: participant.name,
    });

    return participant;
  } catch (error: any) {
    // Firestore 에러 처리
    if (error.code === 'permission-denied') {
      logger.error('[getParticipantByFirebaseUid] Firestore 권한 거부', { firebaseUid, error });
      throw new Error('참가자 정보 조회 권한이 없습니다.');
    }

    logger.error('[getParticipantByFirebaseUid] Firestore 조회 실패', { firebaseUid, error });
    throw error;
  }
}

/**
 * Participant에 Firebase UID 연결
 *
 * @param participantId - Participant 문서 ID
 * @param firebaseUid - Firebase Auth UID
 *
 * @example
 * ```tsx
 * // 로그인 후 Firebase UID 연결
 * const userCredential = await confirmSmsCode(confirmationResult, '123456');
 * await linkFirebaseUid(participant.id, userCredential.user.uid);
 * ```
 */
export async function linkFirebaseUid(
  participantId: string,
  firebaseUid: string
): Promise<void> {
  // 중복 체크: 다른 participant가 이미 이 firebaseUid를 사용하는지 확인
  const existingParticipant = await getParticipantByFirebaseUid(firebaseUid);

  if (existingParticipant && existingParticipant.id !== participantId) {
    logger.error('[linkFirebaseUid] Firebase UID 중복 감지', {
      participantId,
      existingParticipantId: existingParticipant.id,
      firebaseUid,
    });
    throw new Error('이 전화번호는 이미 다른 계정과 연결되어 있습니다.');
  }

  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  await updateDoc(docRef, {
    firebaseUid,
    updatedAt: Timestamp.now(),
  });

  logger.info('Firebase UID 연결 완료', { participantId, firebaseUid });
}
