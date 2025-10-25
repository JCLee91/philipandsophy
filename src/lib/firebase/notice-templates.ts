import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './client';
import { NoticeTemplate, COLLECTIONS } from '@/types/database';

/**
 * Notice Template CRUD Operations
 */

/**
 * 템플릿 생성 (커스텀 ID 사용)
 */
export async function createNoticeTemplate(
  id: string,
  data: Omit<NoticeTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const db = getDb();
  const now = Timestamp.now();

  await setDoc(doc(db, COLLECTIONS.NOTICE_TEMPLATES, id), {
    category: data.category,
    title: data.title,
    content: data.content,
    imageUrl: data.imageUrl || null,
    order: data.order,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * 템플릿 조회 (ID로)
 */
export async function getNoticeTemplateById(
  id: string
): Promise<NoticeTemplate | null> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICE_TEMPLATES, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as NoticeTemplate;
}

/**
 * 모든 템플릿 조회 (카테고리별, order순 정렬)
 */
export async function getAllNoticeTemplates(): Promise<NoticeTemplate[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.NOTICE_TEMPLATES),
    orderBy('category', 'asc'),
    orderBy('order', 'asc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NoticeTemplate[];
}

/**
 * 템플릿 업데이트
 */
export async function updateNoticeTemplate(
  id: string,
  data: Partial<Omit<NoticeTemplate, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICE_TEMPLATES, id);

  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 템플릿 삭제
 */
export async function deleteNoticeTemplate(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.NOTICE_TEMPLATES, id);
  await deleteDoc(docRef);
}

/**
 * 템플릿을 카테고리별로 그룹핑
 */
export function groupTemplatesByCategory(
  templates: NoticeTemplate[]
): Record<string, NoticeTemplate[]> {
  return templates.reduce(
    (acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, NoticeTemplate[]>
  );
}

/**
 * 카테고리 라벨 맵
 */
export const CATEGORY_LABELS: Record<string, string> = {
  onboarding: '🎓 온보딩',
  guide: '📖 가이드',
  milestone: '🎯 마일스톤',
  event: '🎉 이벤트',
};
