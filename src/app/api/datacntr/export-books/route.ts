import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';

/**
 * GET /api/datacntr/export-books
 * 독서 인증에서 제출된 모든 책 목록 추출
 */
export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // 어드민, 슈퍼어드민, 고스트 ID 목록 수집
    const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
    const excludedIds = new Set<string>();
    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.isSuperAdmin || data.isAdministrator || data.isGhost) {
        excludedIds.add(doc.id);
      }
    });

    const snapshot = await db.collection(COLLECTIONS.READING_SUBMISSIONS).get();

    // 책 제목별로 그룹화 (중복 제거)
    const bookMap = new Map<string, { title: string; author?: string; count: number }>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // 어드민, 슈퍼어드민, 고스트 제출물 제외
      if (excludedIds.has(data.participantId)) return;

      // draft 제출물 제외
      if (data.status === 'draft') return;

      const title = data.bookTitle;
      const author = data.bookAuthor || '저자 미상';

      if (title) {
        const key = `${title}|||${author}`;
        if (bookMap.has(key)) {
          const existing = bookMap.get(key)!;
          existing.count += 1;
        } else {
          bookMap.set(key, { title, author, count: 1 });
        }
      }
    });

    // 인증 횟수 내림차순 정렬
    const bookList = Array.from(bookMap.values()).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      totalSubmissions: snapshot.size,
      uniqueBooks: bookList.length,
      books: bookList,
    });
  } catch (error: any) {

    return NextResponse.json(
      { success: false, error: error.message || '책 목록 추출 실패' },
      { status: 500 }
    );
  }
}
