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
import { Participant, BookHistoryEntry, COLLECTIONS, Cohort } from '@/types/database';

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
 * UID 중복 처리:
 * - 동일 UID를 가진 문서가 여러 개면 최신 cohort 문서를 선택
 * - 나머지 문서의 firebaseUid는 null로 정리 (재발 방지)
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

  // Map docs to participant objects
  const participantsWithDocs = querySnapshot.docs.map((docSnapshot) => ({
    docSnapshot,
    participant: {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as Participant,
  }));

  // If only one, return it
  if (participantsWithDocs.length === 1) {
    return participantsWithDocs[0].participant;
  }

  // 여러 기수에 등록된 경우 최적의 참가자 정보 선택
  // 1. 활성 코호트 우선 (isActive: true)
  // 2. 최신 기수 우선 (startDate 기준 내림차순)
  // 3. 생성일 기준 최신순 (createdAt 기준 내림차순)
  
  const cohortIds = [...new Set(participantsWithDocs.map(p => p.participant.cohortId).filter(Boolean))];
  
  // 코호트 정보 일괄 조회
  const cohortDocs = await Promise.all(
    cohortIds.map(id => getDoc(doc(db, COLLECTIONS.COHORTS, id)))
  );

  const cohortMap = new Map<string, Cohort>();
  cohortDocs.forEach(docSnap => {
    if (docSnap.exists()) {
      cohortMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Cohort);
    }
  });

  // 정렬
  participantsWithDocs.sort((a, b) => {
    const pA = a.participant;
    const pB = b.participant;
    
    const cA = cohortMap.get(pA.cohortId);
    const cB = cohortMap.get(pB.cohortId);

    // Priority 1: 활성 코호트 우선
    const isActiveA = cA?.isActive ?? false;
    const isActiveB = cB?.isActive ?? false;
    if (isActiveA !== isActiveB) {
      return isActiveA ? -1 : 1; // Active first
    }

    // Priority 2: 기수 시작일 (최신순)
    const dateA = cA?.startDate || '';
    const dateB = cB?.startDate || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Descending string comparison (ISO dates)
    }

    // Priority 3: 생성일 (최신순) - Tie breaker
    const timeA = pA.createdAt?.toMillis() || 0;
    const timeB = pB.createdAt?.toMillis() || 0;
    return timeB - timeA;
  });

  return participantsWithDocs[0].participant;
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
