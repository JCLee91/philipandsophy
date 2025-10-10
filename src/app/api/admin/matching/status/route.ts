import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { getTodayString } from '@/lib/date-utils';

// Firebase Admin 초기화 (이미 초기화되어 있으면 재사용)
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../../../../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin 초기화 실패:', error);
  }
}

const db = admin.firestore();

/**
 * GET /api/admin/matching/status?cohortId=xxx&date=yyyy-mm-dd
 * 특정 날짜의 제출 현황 조회
 */
export async function GET(request: NextRequest) {
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
    console.error('제출 현황 조회 실패:', error);
    return NextResponse.json(
      {
        error: '제출 현황 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
