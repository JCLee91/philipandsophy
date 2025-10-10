import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getTodayString } from '@/lib/date-utils';

// Firebase Admin 초기화 (이미 초기화되어 있으면 재사용)
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../../../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin 초기화 실패:', error);
  }
}

const db = admin.firestore();

interface SubmissionData {
  participantId: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submissionDate: string;
}

interface ParticipantData {
  id: string;
  name: string;
}

/**
 * POST /api/admin/matching
 * AI 매칭 실행 API
 */
export async function POST(request: NextRequest) {
  try {
    const { cohortId } = await request.json();

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 오늘의 질문 가져오기
    const todayQuestion = getDailyQuestionText();
    const today = getTodayString();

    // 2. 오늘 제출한 참가자들의 답변 가져오기
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', today)
      .where('dailyQuestion', '==', todayQuestion)
      .get();

    if (submissionsSnapshot.size < 4) {
      return NextResponse.json(
        {
          error: '매칭하기에 충분한 참가자가 없습니다.',
          message: `최소 4명이 필요하지만 현재 ${submissionsSnapshot.size}명만 제출했습니다.`,
          participantCount: submissionsSnapshot.size,
        },
        { status: 400 }
      );
    }

    // 3. 참가자 정보와 답변 수집
    const participantAnswers: ParticipantAnswer[] = [];
    const participantIds = new Set<string>();

    for (const doc of submissionsSnapshot.docs) {
      const submission = doc.data() as SubmissionData;

      // 중복 제거
      if (participantIds.has(submission.participantId)) {
        continue;
      }
      participantIds.add(submission.participantId);

      // 참가자 이름 가져오기
      const participantDoc = await db
        .collection('participants')
        .doc(submission.participantId)
        .get();

      if (!participantDoc.exists) {
        console.warn(`참가자 정보를 찾을 수 없음: ${submission.participantId}`);
        continue;
      }

      const participant = participantDoc.data() as ParticipantData;

      participantAnswers.push({
        id: submission.participantId,
        name: participant.name,
        answer: submission.dailyAnswer,
      });
    }

    // 4. AI 매칭 수행
    const matching = await matchParticipantsByAI(todayQuestion, participantAnswers);

    // 5. Cohort 문서에 매칭 결과 저장
    const cohortRef = db.collection('cohorts').doc(cohortId);
    const cohortDoc = await cohortRef.get();

    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: 'Cohort를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const dailyFeaturedParticipants = cohortDoc.data()?.dailyFeaturedParticipants || {};
    const todaysMatching: {
      similar: string[];
      opposite: string[];
      reasons?: {
        similar?: string;
        opposite?: string;
        summary?: string;
      };
    } = {
      similar: matching.similar,
      opposite: matching.opposite,
    };
    if (matching.reasons) {
      todaysMatching.reasons = matching.reasons;
    }
    dailyFeaturedParticipants[today] = todaysMatching;

    await cohortRef.update({
      dailyFeaturedParticipants,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // 6. 매칭 결과와 함께 참가자 이름 정보 반환
    const similarParticipants = participantAnswers.filter(p => 
      matching.similar.includes(p.id)
    );
    const oppositeParticipants = participantAnswers.filter(p => 
      matching.opposite.includes(p.id)
    );

    return NextResponse.json({
      success: true,
      date: today,
      question: todayQuestion,
      totalParticipants: participantAnswers.length,
      matching: {
        similar: matching.similar,
        opposite: matching.opposite,
        reasons: matching.reasons ?? null,
      },
      participants: {
        similar: similarParticipants.map(p => ({ id: p.id, name: p.name })),
        opposite: oppositeParticipants.map(p => ({ id: p.id, name: p.name })),
      },
      reasons: matching.reasons ?? null,
    });

  } catch (error) {
    console.error('매칭 실행 실패:', error);
    return NextResponse.json(
      {
        error: '매칭 실행 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/matching?cohortId=xxx&date=yyyy-mm-dd
 * 특정 날짜의 매칭 결과 조회
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

    // Cohort 문서에서 매칭 결과 가져오기
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();

    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: 'Cohort를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const dailyFeaturedParticipants = cohortDoc.data()?.dailyFeaturedParticipants || {};
    const matching = dailyFeaturedParticipants[date];

    if (!matching) {
      return NextResponse.json(
        { error: '해당 날짜의 매칭 결과가 없습니다.' },
        { status: 404 }
      );
    }

    // 참가자 이름 정보 가져오기
    const participantIds = [...matching.similar, ...matching.opposite];
    const participantsData = await Promise.all(
      participantIds.map(async (id) => {
        const doc = await db.collection('participants').doc(id).get();
        return doc.exists ? { id, name: doc.data()?.name } : { id, name: '알 수 없음' };
      })
    );

    const similarParticipants = participantsData.filter(p => 
      matching.similar.includes(p.id)
    );
    const oppositeParticipants = participantsData.filter(p => 
      matching.opposite.includes(p.id)
    );

    return NextResponse.json({
      success: true,
      date,
      matching: {
        similar: matching.similar,
        opposite: matching.opposite,
        reasons: matching.reasons ?? null,
      },
      participants: {
        similar: similarParticipants,
        opposite: oppositeParticipants,
      },
      reasons: matching.reasons ?? null,
      question: getDailyQuestionText(date),
    });

  } catch (error) {
    console.error('매칭 결과 조회 실패:', error);
    return NextResponse.json(
      {
        error: '매칭 결과 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
