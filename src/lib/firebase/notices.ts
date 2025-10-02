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
import { Notice, COLLECTIONS } from '@/types/database';

/**
 * Notice CRUD Operations
 */

/**
 * 공지 생성
 */
export async function createNotice(
  data: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();

  const docRef = await addDoc(collection(db, COLLECTIONS.NOTICES), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * 공지 조회 (ID로)
 */
export async function getNoticeById(id: string): Promise<Notice | null> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICES, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Notice;
}

/**
 * 기수별 공지 조회
 */
export async function getNoticesByCohort(cohortId: string): Promise<Notice[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.NOTICES),
    where('cohortId', '==', cohortId),
    orderBy('createdAt', 'asc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Notice[];
}

/**
 * 모든 공지 조회
 */
export async function getAllNotices(): Promise<Notice[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.NOTICES),
    orderBy('createdAt', 'asc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Notice[];
}

/**
 * 공지 업데이트
 */
export async function updateNotice(
  id: string,
  data: Partial<Omit<Notice, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICES, id);

  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 공지 고정 토글
 */
export async function toggleNoticePin(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICES, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Notice not found');
  }

  const currentData = docSnap.data() as Notice;

  await updateDoc(docRef, {
    isPinned: !currentData.isPinned,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 공지 삭제
 */
export async function deleteNotice(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICES, id);
  await deleteDoc(docRef);
}

/**
 * 공지 검색 (커스텀 쿼리)
 */
export async function searchNotices(
  constraints: QueryConstraint[]
): Promise<Notice[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTIONS.NOTICES), ...constraints);

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Notice[];
}
