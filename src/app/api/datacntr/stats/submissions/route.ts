import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';

/**
 * 독서 인증 분석 통계 API
 */
export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const { email, uid, error } = await requireAuthToken(request);
    if (error) {
      return error;
    }

    const db = getAdminDb();

    // 관리자 ID 목록 생성
    const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
    const adminIds = new Set<string>();
    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.isSuperAdmin) {
        adminIds.add(doc.id);
      }
    });

    // 모든 독서 인증 조회 (관리자 제외)
    const submissionsSnapshot = await db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .get();

    const nonAdminSubmissions = submissionsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !adminIds.has(data.participantId);
    });

    // 1. 시간대별 제출 분포
    const timeDistribution = {
      '06-09': 0,
      '09-12': 0,
      '12-15': 0,
      '15-18': 0,
      '18-21': 0,
      '21-24': 0,
      '00-06': 0, // 자정~새벽
    };

    // 2. 책 정보 수집 (읽은 사람 수 기준)
    const bookReaders = new Map<string, Set<string>>(); // bookTitle -> Set<participantId>

    // 3. 리뷰 품질 데이터
    let totalReviewLength = 0;
    let longReviewCount = 0; // 200자 이상
    let hasCoverImageCount = 0; // 책 표지 이미지 있음

    nonAdminSubmissions.forEach((doc) => {
      const data = doc.data();

      // 시간대별 분포
      const submittedAt = safeTimestampToDate(data.submittedAt);
      if (submittedAt) {
        const hour = submittedAt.getHours();
        if (hour >= 6 && hour < 9) timeDistribution['06-09']++;
        else if (hour >= 9 && hour < 12) timeDistribution['09-12']++;
        else if (hour >= 12 && hour < 15) timeDistribution['12-15']++;
        else if (hour >= 15 && hour < 18) timeDistribution['15-18']++;
        else if (hour >= 18 && hour < 21) timeDistribution['18-21']++;
        else if (hour >= 21 && hour < 24) timeDistribution['21-24']++;
        else timeDistribution['00-06']++;
      }

      // 책별 읽은 사람 수집 (같은 사람이 여러 번 인증해도 1명으로)
      if (data.bookTitle && data.participantId) {
        const title = data.bookTitle.trim();
        if (!bookReaders.has(title)) {
          bookReaders.set(title, new Set());
        }
        bookReaders.get(title)!.add(data.participantId);
      }

      // 리뷰 품질
      const review = data.review || '';
      totalReviewLength += review.length;
      if (review.length >= 200) {
        longReviewCount++;
      }

      // 책 표지 이미지 (bookCoverUrl 또는 bookImageUrl이 있으면)
      if (data.bookCoverUrl || data.bookImageUrl) {
        hasCoverImageCount++;
      }
    });

    const totalSubmissions = nonAdminSubmissions.length;

    // 시간대별 백분율 계산
    const timeDistributionPercent = Object.entries(timeDistribution).map(([timeRange, count]) => ({
      timeRange,
      count,
      percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
    }));

    // 책 다양성 지표
    const uniqueBookCount = bookReaders.size;

    // 평균 중복도 = 책당 평균 읽은 사람 수
    const totalReaders = Array.from(bookReaders.values()).reduce(
      (sum, readers) => sum + readers.size,
      0
    );
    const averageDuplication = uniqueBookCount > 0
      ? Number((totalReaders / uniqueBookCount).toFixed(1))
      : 0;

    // 인기 책 Top 5 (읽은 사람 수 기준)
    const topBooks = Array.from(bookReaders.entries())
      .map(([title, readers]) => ({
        title,
        count: readers.size // 읽은 사람 수
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 리뷰 품질 지표
    const averageReviewLength = totalSubmissions > 0 ? Math.round(totalReviewLength / totalSubmissions) : 0;
    const longReviewPercentage = totalSubmissions > 0 ? Math.round((longReviewCount / totalSubmissions) * 100) : 0;
    const coverImagePercentage = totalSubmissions > 0 ? Math.round((hasCoverImageCount / totalSubmissions) * 100) : 0;

    return NextResponse.json({
      timeDistribution: timeDistributionPercent,
      bookDiversity: {
        totalSubmissions,
        uniqueBookCount,
        averageDuplication,
        topBooks,
      },
      reviewQuality: {
        averageReviewLength,
        longReviewPercentage,
        coverImagePercentage,
      },
    });
  } catch (error) {
    logger.error('독서 인증 분석 조회 실패', error);
    return NextResponse.json(
      { error: '독서 인증 분석 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
