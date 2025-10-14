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
import { SESSION_CONFIG } from '@/constants/session';

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
 * @deprecated Use updateParticipantBookInfo instead
 * 하위 호환성을 위해 유지
 */
export async function updateParticipantBookTitle(
  participantId: string,
  newBookTitle: string
): Promise<void> {
  return updateParticipantBookInfo(participantId, newBookTitle);
}

/**
 * 세션 토큰 생성 및 저장
 *
 * @param participantId - 참가자 ID
 * @returns 생성된 세션 토큰
 */
export async function createSessionToken(participantId: string): Promise<string> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  // 세션 토큰 생성 (UUID 형식)
  const sessionToken = crypto.randomUUID();

  // 세션 만료 시간: 24시간 후
  const sessionExpiry = Date.now() + SESSION_CONFIG.SESSION_DURATION;

  await updateDoc(docRef, {
    sessionToken,
    sessionExpiry,
    updatedAt: Timestamp.now(),
  });

  logger.info('세션 토큰 생성', { participantId, expiresIn: '24시간' });

  return sessionToken;
}

/**
 * 세션 토큰으로 참가자 조회 및 검증
 *
 * 슬라이딩 윈도우 전략:
 * - 세션이 유효하면 참가자 정보 반환
 * - 남은 세션 시간이 12시간 미만이면 자동으로 24시간 연장
 * - 유예 시간(5분) 내에서는 세션 유지 후 연장
 * - 유예 시간 초과 시 세션 만료 처리
 *
 * @param sessionToken - 세션 토큰
 * @returns 유효한 참가자 정보 또는 null
 */
export async function getParticipantBySessionToken(
  sessionToken: string
): Promise<Participant | null> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('sessionToken', '==', sessionToken)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const docSnap = querySnapshot.docs[0];
  const participant = {
    id: docSnap.id,
    ...docSnap.data(),
  } as Participant;

  const now = Date.now();
  const sessionExpiry = participant.sessionExpiry;

  // 세션 만료 확인
  if (sessionExpiry && sessionExpiry < now) {
    // 시계 오차 및 네트워크 지연을 고려한 유예 시간
    const graceTimeRemaining = SESSION_CONFIG.GRACE_PERIOD - (now - sessionExpiry);

    if (graceTimeRemaining <= 0) {
      // 유예 시간 초과: 세션 만료
      logger.info('세션 만료 (유예 시간 초과)', {
        participantId: participant.id,
        expiredAgo: Math.floor((now - sessionExpiry) / 1000 / 60) + '분'
      });
      await clearSessionToken(participant.id);
      return null;
    }

    // 유예 시간 내: 세션 유지하고 자동 연장
    logger.warn('세션 만료 임박 (유예 시간 내), 자동 연장', {
      participantId: participant.id,
      graceTimeRemaining: Math.floor(graceTimeRemaining / 1000) + '초'
    });

    // 유예 시간 내에서는 무조건 연장
    const newExpiry = now + SESSION_CONFIG.SESSION_DURATION;
    await updateDoc(doc(db, COLLECTIONS.PARTICIPANTS, participant.id), {
      sessionExpiry: newExpiry,
      updatedAt: Timestamp.now(),
    });

    // 반환값의 sessionExpiry도 업데이트
    participant.sessionExpiry = newExpiry;
    return participant;
  }

  // 세션이 아직 유효한 경우: 자동 연장 임계값 체크
  if (sessionExpiry) {
    const timeUntilExpiry = sessionExpiry - now;

    // 남은 세션 시간이 12시간 미만이면 자동 연장
    if (timeUntilExpiry < SESSION_CONFIG.AUTO_EXTEND_THRESHOLD) {
      const hoursRemaining = Math.floor(timeUntilExpiry / 1000 / 60 / 60);

      logger.info('세션 자동 연장', {
        participantId: participant.id,
        hoursRemaining: hoursRemaining + '시간',
        extendedTo: '24시간'
      });

      const newExpiry = now + SESSION_CONFIG.SESSION_DURATION;
      await updateDoc(doc(db, COLLECTIONS.PARTICIPANTS, participant.id), {
        sessionExpiry: newExpiry,
        updatedAt: Timestamp.now(),
      });

      // 반환값의 sessionExpiry도 업데이트
      participant.sessionExpiry = newExpiry;
    }
  }

  return participant;
}

/**
 * 세션 토큰 제거 (로그아웃)
 *
 * @param participantId - 참가자 ID
 */
export async function clearSessionToken(participantId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  await updateDoc(docRef, {
    sessionToken: deleteField(),
    sessionExpiry: deleteField(),
    updatedAt: Timestamp.now(),
  });
}
