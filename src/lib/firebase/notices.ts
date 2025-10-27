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

  const noticeData: {
    cohortId: string;
    author: string;
    content: string;
    isCustom: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    templateId?: string;
    imageUrl?: string;
    order?: number;
  } = {
    cohortId: data.cohortId,
    author: data.author,
    content: data.content,
    isCustom: data.isCustom,
    createdAt: now,
    updatedAt: now,
  };

  // Optional 필드들
  if (data.templateId) {
    noticeData.templateId = data.templateId;
  }
  if (data.imageUrl) {
    noticeData.imageUrl = data.imageUrl;
  }
  if (data.order !== undefined) {
    noticeData.order = data.order;
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.NOTICES), noticeData);

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
 * 기수별 공지 조회 (발행된 공지만)
 * createdAt 내림차순 정렬 (최신순)
 *
 * ✅ Draft notices (status: 'draft') are filtered out for regular users
 * ✅ Only published notices (status: 'published' or no status field) are returned
 */
export async function getNoticesByCohort(cohortId: string): Promise<Notice[]> {
  const db = getDb();

  // Query for published notices only (status is 'published' or undefined)
  // We query all notices for the cohort, then filter client-side since Firestore
  // doesn't support OR queries for undefined/missing fields efficiently
  const q = query(
    collection(db, COLLECTIONS.NOTICES),
    where('cohortId', '==', cohortId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  // Filter out draft notices client-side
  return querySnapshot.docs
    .filter((doc) => {
      const data = doc.data();
      // Only include if status is undefined/null or 'published'
      return !data.status || data.status === 'published';
    })
    .map((doc) => ({
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
