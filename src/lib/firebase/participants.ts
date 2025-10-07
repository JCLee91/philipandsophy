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
} from 'firebase/firestore';
import { getDb } from './client';
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
 * 참가자의 책 제목 업데이트 (책 변경 감지 및 이력 관리)
 *
 * @param participantId - 참가자 ID
 * @param newBookTitle - 새로운 책 제목
 * @returns void
 *
 * 동작:
 * 1. 현재 책 제목과 새 책 제목이 같으면 아무것도 하지 않음
 * 2. 다르면:
 *    - 이전 책의 endedAt을 현재 시각으로 설정
 *    - 새 책을 bookHistory에 추가 (endedAt: null)
 *    - currentBookTitle 업데이트
 */
export async function updateParticipantBookTitle(
  participantId: string,
  newBookTitle: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  // 현재 참가자 정보 조회
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Participant not found');
  }

  const participant = docSnap.data() as Participant;
  const currentBookTitle = participant.currentBookTitle;
  const bookHistory = participant.bookHistory || [];

  // 책 제목이 같으면 업데이트 불필요
  if (currentBookTitle === newBookTitle) {
    return;
  }

  const now = Timestamp.now();
  let updatedHistory = [...bookHistory];

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

  // Firestore 업데이트
  await updateDoc(docRef, {
    currentBookTitle: newBookTitle,
    bookHistory: updatedHistory,
    updatedAt: now,
  });
}
