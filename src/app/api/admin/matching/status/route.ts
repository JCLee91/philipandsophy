import { NextRequest, NextResponse } from 'next/server';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { getTodayString } from '@/lib/date-utils';
import { requireAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/matching/status?cohortId=xxx&date=yyyy-mm-dd
 * 특정 날짜의 제출 현황 조회
 */
export async function GET(request: NextRequest) {
  // 관리자 권한 검증
  const { error: authError } = await requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const cohortId = searchParams.get('cohortId');
    const date = searchParams.get('date') || getTodayString();

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 해당 날짜의 질문 가져오기
    const question = getDailyQuestionText(date);

    // Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // 오늘 제출한 참가자 수 조회
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', date)
      .where('dailyQuestion', '==', question)
      .get();

    // 중복 제거 (한 사람이 여러 번 제출한 경우)
    const uniqueParticipantIds = new Set<string>();
    submissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      uniqueParticipantIds.add(data.participantId);
    });

    return NextResponse.json({
      success: true,
      date,
      question,
      submissionCount: uniqueParticipantIds.size,
      totalSubmissions: submissionsSnapshot.size,
    });

  } catch (error) {
    logger.error('제출 현황 조회 실패', error);
    return NextResponse.json(
      {
        error: '제출 현황 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
