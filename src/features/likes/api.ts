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
 * targetId에서 실제 submission ID를 추출
 * targetId 형식: {submissionId}_review 또는 {submissionId}_answer
 */
function extractSubmissionId(targetId: string): string {
  // _review 또는 _answer suffix 제거
  if (targetId.endsWith('_review')) {
    return targetId.slice(0, -7);
  }
  if (targetId.endsWith('_answer')) {
    return targetId.slice(0, -7);
  }
  // 이전 형식 호환성을 위해 그대로 반환
  return targetId;
}

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
  // targetId는 이제 submissionId_review 또는 submissionId_answer 형식
  const likeDocId = `${userId}_${targetId}`;
  const likeDocRef = doc(db, LIKES_COLLECTION, likeDocId);
  
  // submission 문서는 실제 submissionId로 조회
  const submissionId = extractSubmissionId(targetId);
  const targetDocRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  
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
 * targetId는 submissionId_review 또는 submissionId_answer 형식일 수 있음
 */
export async function fetchSubmissionsByIds(
  targetIds: string[]
): Promise<Map<string, ReadingSubmission>> {
  if (!targetIds.length) return new Map();

  const db = getDb();
  const submissionMap = new Map<string, ReadingSubmission>();

  // 중복 제거를 위해 실제 submissionId -> targetIds 매핑
  const submissionIdToTargetIds = new Map<string, string[]>();
  targetIds.forEach(targetId => {
    const submissionId = extractSubmissionId(targetId);
    const existing = submissionIdToTargetIds.get(submissionId) || [];
    existing.push(targetId);
    submissionIdToTargetIds.set(submissionId, existing);
  });

  // Firestore는 batch get을 직접 지원하지 않으므로 개별 조회
  // 최적화 필요시 in query 분할 또는 캐싱 적용 가능
  const promises = Array.from(submissionIdToTargetIds.entries()).map(async ([submissionId, relatedTargetIds]) => {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const submission = { id: docSnap.id, ...docSnap.data() } as ReadingSubmission;
        // 모든 관련 targetId에 대해 같은 submission 매핑
        relatedTargetIds.forEach(targetId => {
          submissionMap.set(targetId, submission);
        });
      }
    } catch (error) {
      logger.error(`Error fetching submission ${submissionId}:`, error);
    }
  });

  await Promise.all(promises);
  return submissionMap;
}
