import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  runTransaction, 
  serverTimestamp,
  increment,
  limit,
  orderBy
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { LikeData } from './types';

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
    console.error('Error toggling like:', error);
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
 * 특정 타겟들의 좋아요 상태 조회 (Batch check for current user)
 */
export async function checkLikeStatus(
  userId: string, 
  targetIds: string[]
): Promise<Record<string, boolean>> {
  if (!targetIds.length) return {};
  
  const db = getDb();
  const statusMap: Record<string, boolean> = {};
  
  // Firestore limit for 'in' query is 10. Split if necessary, but typically simple loop or compound ID check is better
  // Since we construct ID as userId_targetId, we can just getDocs with those IDs?
  // Firestore doesn't support getMultiple by IDs natively well without 'in'. 
  // Given standard constraints, let's query by userId and filter in memory or loop.
  // Efficient way: Fetch all my likes? If lists are long, this is bad.
  // Better: Since we view ~10 items at a time, we can assume targetIds is small.
  
  // Strategy: Fetch all likes by me (assuming user doesn't like thousands of posts per day).
  // If scaling is needed, implement pagination or 'in' queries.
  // For now, fetching all my likes is reasonable for a cohort-based app.
  
  const myLikes = await fetchMyLikes(userId);
  myLikes.forEach(like => {
    statusMap[like.targetId] = true;
  });
  
  return statusMap;
}
