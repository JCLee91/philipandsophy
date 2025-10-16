import { NextRequest, NextResponse } from 'next/server';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { getTodayString } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/matching/status?cohortId=xxx&date=yyyy-mm-dd
 * 특정 날짜의 제출 현황 조회
 */
export async function GET(request: NextRequest) {
  // 관리자 권한 검증
  const { error: authError } = await requireWebAppAdmin(request);
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

    // 🔒 해당 코호트 참가자만 필터링 (다중 코호트 운영 시 데이터 혼입 방지)
    const participantIds = new Set<string>();
    submissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      participantIds.add(data.participantId);
    });

    // 배치 처리로 참가자 정보 조회 및 cohortId 검증
    const validParticipantIds = new Set<string>();
    const participantIdsArray = Array.from(participantIds);

    for (let i = 0; i < participantIdsArray.length; i += 10) {
      const batchIds = participantIdsArray.slice(i, i + 10);
      const batchDocs = await db
        .collection('participants')
        .where('__name__', 'in', batchIds)
        .get();

      batchDocs.docs.forEach((doc) => {
        const participant = doc.data();
        if (participant.cohortId === cohortId) {
          validParticipantIds.add(doc.id);
        }
      });
    }

    return NextResponse.json({
      success: true,
      date,
      question,
      submissionCount: validParticipantIds.size,
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
