'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  runTransaction,
  deleteField,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from './client';
import { logger } from '@/lib/logger';
import { Participant, BookHistoryEntry, COLLECTIONS, Cohort } from '@/types/database';
import { generateUniqueParticipantId } from './id-generator';

/**
 * Participant CRUD Operations
 */

/**
 * 참가자 생성
 * ID 형식: cohort{기수}-{이름} (예: cohort4-은지, cohort6-종찬)
 * 동명이인 처리: 숫자 suffix (cohort4-은지, cohort4-은지2)
 */
export async function createParticipant(
  data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();

  // 동명이인 체크를 위해 기존 참가자 조회
  const existingParticipants = await getParticipantsByCohort(data.cohortId);
  const existingIds = existingParticipants.map(p => p.id);

  // 커스텀 ID 생성 (cohort{기수}-{이름})
  const customId = generateUniqueParticipantId(data.cohortId, data.name, existingIds);

  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, customId);
  await setDoc(docRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return customId;
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
 * 전화번호로 모든 참가자 조회 (여러 코호트 참가 지원)
 *
 * @param phoneNumber - 전화번호
 * @returns 해당 전화번호로 등록된 모든 참가자 배열
 */
export async function getAllParticipantsByPhoneNumber(
  phoneNumber: string
): Promise<Participant[]> {
  const db = getDb();
  const cleanNumber = phoneNumber.replace(/-/g, '');
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('phoneNumber', '==', cleanNumber)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return [];
  }

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Participant));
}

/**
 * 참가자 조회 (전화번호로)
 *
 * 여러 코호트에 동일 전화번호로 등록된 경우:
 * 1. 활성 코호트(isActive: true) 우선
 * 2. 그 다음 최신 코호트 (cohortId 숫자 기준 내림차순)
 */
export async function getParticipantByPhoneNumber(
  phoneNumber: string
): Promise<Participant | null> {
  const participants = await getAllParticipantsByPhoneNumber(phoneNumber);

  if (participants.length === 0) {
    return null;
  }

  if (participants.length === 1) {
    return participants[0];
  }

  // 여러 코호트에 등록된 경우 활성 코호트 우선
  const db = getDb();
  const cohortIds = [...new Set(participants.map(p => p.cohortId))];
  const cohortPromises = cohortIds.map(id =>
    getDoc(doc(db, COLLECTIONS.COHORTS, id))
  );
  const cohortDocs = await Promise.all(cohortPromises);

  const cohortActiveMap = new Map<string, boolean>();
  cohortDocs.forEach((cohortDoc, index) => {
    if (cohortDoc.exists()) {
      cohortActiveMap.set(cohortIds[index], cohortDoc.data()?.isActive ?? false);
    }
  });

  // 활성 코호트의 참가자 우선 반환
  const activeParticipant = participants.find(p =>
    cohortActiveMap.get(p.cohortId) === true
  );

  if (activeParticipant) {
    return activeParticipant;
  }

  // 모두 비활성이면 최신 코호트 반환 (cohortId 숫자 기준 내림차순)
  participants.sort((a, b) => {
    const aNum = parseInt(a.cohortId) || 0;
    const bNum = parseInt(b.cohortId) || 0;
    return bNum - aNum;
  });

  return participants[0];
}

/**
 * 참가자 조회 (Firebase UID로)
 *
 * Firebase Phone Auth로 로그인한 사용자의 UID로 참가자 조회
 *
 * 자동 마이그레이션:
 * - firebaseUid로 찾은 문서와 phoneNumber로 찾은 올바른 문서가 다르면
 * - firebaseUid를 올바른 문서로 자동 이동 (활성 코호트 우선, 최신 코호트 순)
 */
export async function getParticipantByFirebaseUid(
  firebaseUid: string
): Promise<Participant | null> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('firebaseUid', '==', firebaseUid)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  // firebaseUid로 찾은 participant
  const currentParticipant = {
    id: querySnapshot.docs[0].id,
    ...querySnapshot.docs[0].data(),
  } as Participant;

  // phoneNumber가 없으면 마이그레이션 불가, 현재 문서 반환
  if (!currentParticipant.phoneNumber) {
    return currentParticipant;
  }

  // phoneNumber 기준으로 올바른 participant 조회
  // (활성 코호트 우선 → 최신 코호트 순)
  const correctParticipant = await getParticipantByPhoneNumber(currentParticipant.phoneNumber);

  // 올바른 문서가 없거나 같은 문서면 현재 문서 반환
  if (!correctParticipant || correctParticipant.id === currentParticipant.id) {
    return currentParticipant;
  }

  // 다른 문서면 firebaseUid 자동 마이그레이션
  logger.info('[Auto Migration] Moving firebaseUid', {
    from: currentParticipant.id,
    to: correctParticipant.id,
    phoneNumber: currentParticipant.phoneNumber,
  });

  try {
    // 트랜잭션으로 원자적 업데이트
    await runTransaction(db, async (transaction) => {
      const oldDocRef = doc(db, COLLECTIONS.PARTICIPANTS, currentParticipant.id);
      const newDocRef = doc(db, COLLECTIONS.PARTICIPANTS, correctParticipant.id);
      const now = Timestamp.now();

      // 이전 문서의 firebaseUid 제거
      transaction.update(oldDocRef, {
        firebaseUid: null,
        updatedAt: now,
      });

      // 새 문서에 firebaseUid 설정
      transaction.update(newDocRef, {
        firebaseUid,
        updatedAt: now,
      });
    });

    // 마이그레이션 후 올바른 participant 반환 (firebaseUid 포함)
    return {
      ...correctParticipant,
      firebaseUid,
    };
  } catch (error) {
    logger.error('[Auto Migration] Failed to migrate firebaseUid', error);
    // 마이그레이션 실패 시 기존 문서 반환 (서비스 중단 방지)
    return currentParticipant;
  }
}

/**
 * 참가자에 Firebase UID 연결
 *
 * 기존 참가자 계정을 Firebase Auth와 연결
 */
export async function linkFirebaseUid(
  participantId: string,
  firebaseUid: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  await updateDoc(docRef, {
    firebaseUid,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 참가자의 Firebase UID 연결 해제
 *
 * 다중 코호트 참가자가 최신 기수로 이동할 때
 * 이전 참가자 문서의 firebaseUid를 안전하게 비웁니다.
 */
export async function unlinkFirebaseUid(participantId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  await updateDoc(docRef, {
    firebaseUid: null,
    updatedAt: Timestamp.now(),
  });
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

// ❌ REMOVED: getAllParticipants - 미사용 함수 제거

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

// ❌ REMOVED: deleteParticipant - 미사용 함수 제거
// ❌ REMOVED: searchParticipants - 미사용 함수 제거

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
          const updateData: Record<string, any> = {
            updatedAt: now,
          };

          // undefined가 아닌 값만 업데이트 객체에 추가
          if (newBookAuthor !== undefined && newBookAuthor !== '') {
            updateData.currentBookAuthor = newBookAuthor;
          }
          if (newBookCoverUrl !== undefined && newBookCoverUrl !== '') {
            updateData.currentBookCoverUrl = newBookCoverUrl;
          }

          transaction.update(docRef, updateData);
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
        const updateData: Record<string, any> = {
          currentBookTitle: newBookTitle,
          bookHistory: updatedHistory,
          updatedAt: now,
        };

        // undefined가 아닌 값만 업데이트 객체에 추가
        if (newBookAuthor !== undefined && newBookAuthor !== '') {
          updateData.currentBookAuthor = newBookAuthor;
        }
        if (newBookCoverUrl !== undefined && newBookCoverUrl !== '') {
          updateData.currentBookCoverUrl = newBookCoverUrl;
        }

        transaction.update(docRef, updateData);
      });

      return; // Success - exit function
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {

        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
    }
  }
}

// ❌ REMOVED: updateParticipantBookTitle - deprecated 함수 제거 (미사용)

/**
 * Subscribe to participants of a specific cohort
 */
export const subscribeToCohortParticipants = (
  cohortId: string,
  callback: (participants: Participant[]) => void
) => {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('cohortId', '==', cohortId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const participants = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];
      callback(participants);
    },
    (error) => {
      console.error('Error subscribing to cohort participants:', error);
      callback([]);
    }
  );
};
