import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getTodayString, getYesterdayString } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';
import type { SubmissionData, ParticipantData } from '@/types/database';

/**
 * POST /api/admin/matching
 * AI 매칭 실행 API
 */
export async function POST(request: NextRequest) {
  // 관리자 권한 검증 (Firebase Phone Auth)
  const { user, error } = await requireWebAppAdmin(request);
  if (error) {
    return error;
  }

  try {
    const { cohortId } = await request.json();

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 어제의 질문 가져오기 (매칭은 어제 제출 기반)
    const yesterday = getYesterdayString();
    const yesterdayQuestion = getDailyQuestionText(yesterday);
    const today = getTodayString(); // 매칭 결과는 오늘 날짜로 저장

    // 2. Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // 3. 어제 제출한 참가자들의 답변 가져오기 (매칭 대상)
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', yesterday)
      .where('dailyQuestion', '==', yesterdayQuestion)
      .get();

    if (submissionsSnapshot.size < MATCHING_CONFIG.MIN_PARTICIPANTS) {
      return NextResponse.json(
        {
          error: '매칭하기에 충분한 참가자가 없습니다.',
          message: `최소 ${MATCHING_CONFIG.MIN_PARTICIPANTS}명이 필요하지만 현재 ${submissionsSnapshot.size}명만 제출했습니다.`,
          participantCount: submissionsSnapshot.size,
        },
        { status: 400 }
      );
    }

    // 3. 참가자 정보와 답변 수집 (Batch read로 N+1 쿼리 최적화)
    const participantAnswers: ParticipantAnswer[] = [];
    const submissionsMap = new Map<string, SubmissionData>();

    // 3-1. 중복 제거 및 제출물 수집
    for (const doc of submissionsSnapshot.docs) {
      const submission = doc.data() as SubmissionData;

      // 중복 시 최신 데이터 우선 (나중에 처리된 것이 최신)
      submissionsMap.set(submission.participantId, submission);
    }

    // 3-2. 참가자 ID 목록 추출
    const uniqueParticipantIds = Array.from(submissionsMap.keys());

    // 3-3. Batch read로 모든 참가자 정보 한 번에 가져오기 (최대 10개씩)
    const participantDataMap = new Map<string, ParticipantData>();

    for (let i = 0; i < uniqueParticipantIds.length; i += MATCHING_CONFIG.BATCH_SIZE) {
      const batchIds = uniqueParticipantIds.slice(i, i + MATCHING_CONFIG.BATCH_SIZE);
      const participantDocs = await db
        .collection('participants')
        .where(admin.firestore.FieldPath.documentId(), 'in', batchIds)
        .get();

      participantDocs.docs.forEach((doc) => {
        participantDataMap.set(doc.id, doc.data() as ParticipantData);
      });
    }

    // 3-4. 참가자 정보와 제출물 결합
    for (const [participantId, submission] of submissionsMap.entries()) {
      const participant = participantDataMap.get(participantId);

      if (!participant) {
        logger.warn('참가자 정보를 찾을 수 없음', { participantId });
        continue;
      }

      // 🔒 다른 코호트 참가자 제외 (다중 코호트 운영 시 데이터 혼입 방지)
      if (participant.cohortId !== cohortId) {
        logger.warn('다른 코호트 참가자 제외', {
          participantId,
          expectedCohort: cohortId,
          actualCohort: participant.cohortId,
        });
        continue;
      }

      // 관리자는 매칭에서 제외
      if (participant.isAdmin || participant.isAdministrator) {
        logger.info('관리자 참가자 매칭에서 제외', {
          participantId,
          name: participant.name,
        });
        continue;
      }

      participantAnswers.push({
        id: participantId,
        name: participant.name,
        answer: submission.dailyAnswer,
        gender: participant.gender,
      });
    }

    // 4. 필터링 후 참가자 수 재검증 (AI 최소 인원 조건)
    if (participantAnswers.length < MATCHING_CONFIG.MIN_PARTICIPANTS) {
      return NextResponse.json(
        {
          error: '매칭하기에 충분한 참가자가 없습니다.',
          message: `필터링 후 ${participantAnswers.length}명만 남았습니다. 최소 ${MATCHING_CONFIG.MIN_PARTICIPANTS}명이 필요합니다.`,
          participantCount: participantAnswers.length,
        },
        { status: 400 }
      );
    }

    logger.info('매칭 시작 (Human-in-the-loop)', {
      totalCount: participantAnswers.length,
      maleCount: participantAnswers.filter(p => p.gender === 'male').length,
      femaleCount: participantAnswers.filter(p => p.gender === 'female').length,
    });

    // 5. AI 매칭 수행 (검증 없음 - 관리자가 수동으로 검토/조정)
    const matching = await matchParticipantsByAI(yesterdayQuestion, participantAnswers);

    // 7. Cohort 문서에 매칭 결과 저장 (Transaction으로 race condition 방지)
    const cohortRef = db.collection('cohorts').doc(cohortId);

    try {
      await db.runTransaction(async (transaction) => {
        const cohortDoc = await transaction.get(cohortRef);

        if (!cohortDoc.exists) {
          throw new Error('Cohort를 찾을 수 없습니다.');
        }

        const cohortData = cohortDoc.data();
        const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

        // 오늘 날짜 키로 매칭 결과 저장 (참가자들이 "오늘의 서재"에서 확인)
        dailyFeaturedParticipants[today] = matching;

        transaction.update(cohortRef, {
          dailyFeaturedParticipants,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      });
    } catch (transactionError) {
      if (transactionError instanceof Error && transactionError.message === 'Cohort를 찾을 수 없습니다.') {
        return NextResponse.json(
          { error: 'Cohort를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      throw transactionError; // 다른 에러는 외부 catch로 전파
    }

    // 전체 코호트 참가자 ID 목록 (제출 여부 구분용)
    const allCohortParticipantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    const submittedIds = new Set(participantAnswers.map(p => p.id));
    const notSubmittedParticipants = allCohortParticipantsSnapshot.docs
      .filter(doc => {
        const data = doc.data() as ParticipantData;
        // 관리자 제외 + 제출 안 한 사람만
        return !submittedIds.has(doc.id) &&
               !(data.isAdmin || data.isAdministrator);
      })
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));

    return NextResponse.json({
      success: true,
      date: today, // 매칭 결과는 오늘 날짜로 반환
      question: yesterdayQuestion, // 질문은 어제 질문 (어제 제출 데이터 기반)
      totalParticipants: participantAnswers.length,
      matching,
      submissionStats: {
        submitted: participantAnswers.length,
        notSubmitted: notSubmittedParticipants.length,
        notSubmittedList: notSubmittedParticipants,
      },
    });

  } catch (error) {
    logger.error('매칭 실행 실패', error);
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
  // 관리자 권한 검증 (Firebase Phone Auth)
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

    // Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // Cohort 문서에서 매칭 결과 가져오기
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();

    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: 'Cohort를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const dailyFeaturedParticipants = cohortDoc.data()?.dailyFeaturedParticipants || {};
    const matchingEntry = dailyFeaturedParticipants[date];

    if (!matchingEntry) {
      return NextResponse.json(
        { error: '해당 날짜의 매칭 결과가 없습니다.' },
        { status: 404 }
      );
    }

    // v3.0+ 형식: assignments 필드가 존재
    const normalizedMatching = {
      assignments: matchingEntry.assignments ?? {},
    };

    return NextResponse.json({
      success: true,
      date,
      question: getDailyQuestionText(date),
      matching: normalizedMatching,
    });

  } catch (error) {
    logger.error('매칭 결과 조회 실패', error);
    return NextResponse.json(
      {
        error: '매칭 결과 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
