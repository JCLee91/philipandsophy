import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';

/**
 * GET /api/datacntr/export-books
 * 독서 인증에서 제출된 모든 책 목록 추출
 */
export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const { error } = await requireAuthToken(request);
    if (error) {
      return error;
    }

    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTIONS.READING_SUBMISSIONS).get();

    // 책 제목별로 그룹화 (중복 제거)
    const bookMap = new Map<string, { title: string; author?: string; count: number }>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
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
    console.error('책 목록 추출 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '책 목록 추출 실패' },
      { status: 500 }
    );
  }
}
