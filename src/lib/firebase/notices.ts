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
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from './client';
import { Notice, COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { isPublishedNotice } from './notice-utils';
import { generateNoticeId } from './id-generator';

/**
 * Notice CRUD Operations
 */

/**
 * 공지 생성
 * ID 형식: notice_{cohortId}_{MMDD}_{HHmm}
 * 예: notice_4_1201_1430
 */
export async function createNotice(
  data: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();

  // 커스텀 ID 생성
  const customId = generateNoticeId(data.cohortId);

  const noticeData = {
    cohortId: data.cohortId,
    author: data.author,
    content: data.content,
    isCustom: data.isCustom,
    createdAt: now,
    updatedAt: now,
    ...(data.templateId && { templateId: data.templateId }),
    ...(data.imageUrl && { imageUrl: data.imageUrl }),
    ...(data.order !== undefined && { order: data.order }),
  };

  const docRef = doc(db, COLLECTIONS.NOTICES, customId);
  await setDoc(docRef, noticeData);

  return customId;
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
    .filter((doc) => isPublishedNotice(doc.data()))
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

/**
 * 기수별 공지 실시간 구독 (Slack/Discord 패턴)
 *
 * @param cohortId - 기수 ID
 * @param callback - 공지 업데이트 콜백 함수
 * @returns unsubscribe 함수
 */
export const subscribeToNoticesByCohort = (
  cohortId: string,
  callback: (notices: Notice[]) => void
): (() => void) => {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.NOTICES),
    where('cohortId', '==', cohortId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      // Filter out draft notices client-side
      const notices = snapshot.docs
        .filter((doc) => isPublishedNotice(doc.data()))
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notice[];

      callback(notices);
    },
    (error) => {
      logger.error('Notice subscription error', error);
      // 에러 시 기존 목록을 유지 (빈 목록으로 덮어쓰지 않음)
    }
  );
};
