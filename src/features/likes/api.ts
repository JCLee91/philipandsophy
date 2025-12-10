import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  runTransaction,
  serverTimestamp,
  increment,
  orderBy
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { LikeData } from './types';
import type { ReadingSubmission } from '@/types/database';

export const LIKES_COLLECTION = 'likes';
export const SUBMISSIONS_COLLECTION = 'reading_submissions';

/**
 * 좋아요 토글 (좋아요/취소)
 * Transaction을 사용하여 좋아요 문서 생성/삭제와 카운트 증감을 원자적으로 처리
 */
export async function toggleLike(
  userId: string,
  targetId: string,
  targetType: 'review' | 'answer',
  targetUserId: string
): Promise<{ isLiked: boolean; newCount: number }> {
  const db = getDb();
  
  // 좋아요 문서 ID 생성 규칙: userId_targetId (중복 방지)
  const likeDocId = `${userId}_${targetId}`;
  const likeDocRef = doc(db, LIKES_COLLECTION, likeDocId);
  const targetDocRef = doc(db, SUBMISSIONS_COLLECTION, targetId);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const likeDoc = await transaction.get(likeDocRef);
      const targetDoc = await transaction.get(targetDocRef);
      
      if (!targetDoc.exists()) {
        throw new Error('Target document does not exist');
      }
      
      const currentData = targetDoc.data();
      const countField = targetType === 'review' ? 'reviewLikeCount' : 'answerLikeCount';
      const currentCount = currentData[countField] || 0;
      
      if (likeDoc.exists()) {
        // 이미 좋아요 상태 -> 취소
        transaction.delete(likeDocRef);
        transaction.update(targetDocRef, {
          [countField]: increment(-1)
        });
        return { isLiked: false, newCount: Math.max(0, currentCount - 1) };
      } else {
        // 좋아요 안누른 상태 -> 생성
        transaction.set(likeDocRef, {
          userId,
          targetId,
          targetType,
          targetUserId,
          createdAt: serverTimestamp()
        });
        transaction.update(targetDocRef, {
          [countField]: increment(1)
        });
        return { isLiked: true, newCount: currentCount + 1 };
      }
    });
  } catch (error) {
    logger.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * 내가 보낸 좋아요 목록 조회
 */
export async function fetchMyLikes(userId: string): Promise<LikeData[]> {
  const db = getDb();
  const q = query(
    collection(db, LIKES_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LikeData));
}

/**
 * 내가 받은 좋아요 목록 조회
 */
export async function fetchReceivedLikes(userId: string): Promise<LikeData[]> {
  const db = getDb();
  const q = query(
    collection(db, LIKES_COLLECTION),
    where('targetUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LikeData));
}

/**
 * 여러 submission ID로 submission 데이터 조회
 * 스크랩 기능용 - 좋아요한 글 내용 표시에 사용
 */
export async function fetchSubmissionsByIds(
  targetIds: string[]
): Promise<Map<string, ReadingSubmission>> {
  if (!targetIds.length) return new Map();

  const db = getDb();
  const submissionMap = new Map<string, ReadingSubmission>();

  // Firestore는 batch get을 직접 지원하지 않으므로 개별 조회
  // 최적화 필요시 in query 분할 또는 캐싱 적용 가능
  const promises = targetIds.map(async (id) => {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        submissionMap.set(id, { id: docSnap.id, ...docSnap.data() } as ReadingSubmission);
      }
    } catch (error) {
      logger.error(`Error fetching submission ${id}:`, error);
    }
  });

  await Promise.all(promises);
  return submissionMap;
}
