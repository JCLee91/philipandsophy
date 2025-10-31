import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getTodayString, getMatchingTargetDate } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';
import type { SubmissionData, ParticipantData } from '@/types/database';

/**
 * POST /api/admin/matching
 * AI 매칭 실행 API
 */
export async function POST(request: NextRequest) {
  // 관리자 권한 검증
  const { user, error } = await requireWebAppAdmin(request);
  if (error) {
    return error;
  }

  let requestCohortId: string | undefined;

  try {
    const body = await request.json();
    const { cohortId } = body ?? {};
    requestCohortId = cohortId;

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 매칭 대상 날짜의 질문 가져오기 (새벽 2시 마감 정책 적용)
    const targetDate = getMatchingTargetDate(); // 새벽 2시 마감 고려한 매칭 대상 날짜
    const targetQuestion = getDailyQuestionText(targetDate);
    const today = getTodayString(); // 매칭 결과는 오늘 날짜로 저장

    // 2. Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // 3. 어제 제출한 참가자들의 답변 가져오기 (매칭 대상)
    // 날짜만 확인 (질문은 체크하지 않음 - 새벽 제출자는 다른 질문일 수 있음)
    // draft 상태는 제외 (임시저장은 매칭 대상 아님)
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', targetDate)
      .where('status', '!=', 'draft')
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

        continue;
      }

      // 🔒 다른 코호트 참가자 제외 (다중 코호트 운영 시 데이터 혼입 방지)
      if (!participant.cohortId || participant.cohortId !== cohortId) {

        continue;
      }

      // 슈퍼 관리자만 매칭에서 제외 (일반 관리자는 매칭 대상 포함)
      if (participant.isSuperAdmin) {

        continue;
      }

      // 질문이 다른 경우 로깅 (새벽 제출자)
      if (submission.dailyQuestion !== targetQuestion) {

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

    // 5. AI 매칭 수행 (검증 없음 - 관리자가 수동으로 검토/조정)
    const matching = await matchParticipantsByAI(targetQuestion, participantAnswers);

    // 7. Cohort 문서에 매칭 결과 저장
    const cohortRef = db.collection('cohorts').doc(cohortId);

    // Cohort 존재 여부 먼저 확인
    const cohortDoc = await cohortRef.get();
    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: 'Cohort를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 검증 실패 시 로깅
    if (matching.validation && !matching.validation.valid) {
      logger.error('매칭 확정 시 검증 실패', {
        cohortId,
        date: today,
        errors: matching.validation.errors,
      });
    }

    // Transaction으로 race condition 방지
    await db.runTransaction(async (transaction) => {
      const cohortData = cohortDoc.data();
      const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

      // 오늘 날짜 키로 매칭 결과 저장 (참가자들이 "오늘의 서재"에서 확인)
      // assignments만 저장 (validation은 내부 로깅용)
      dailyFeaturedParticipants[today] = {
        assignments: matching.assignments,
      };

      transaction.update(cohortRef, {
        dailyFeaturedParticipants,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });

    // 전체 코호트 참가자 ID 목록 (제출 여부 구분용)
    const allCohortParticipantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    const submittedIds = new Set(participantAnswers.map(p => p.id));
    const notSubmittedParticipants = allCohortParticipantsSnapshot.docs
      .filter(doc => {
        const data = doc.data() as ParticipantData;
        // 슈퍼 관리자 제외 + 제출 안 한 사람만 (일반 관리자는 포함)
        return !submittedIds.has(doc.id) && !data.isSuperAdmin;
      })
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));

    return NextResponse.json({
      success: true,
      date: today, // 매칭 결과는 오늘 날짜로 반환
      question: targetQuestion, // 질문은 대상 날짜의 질문
      totalParticipants: participantAnswers.length,
      matching: {
        assignments: matching.assignments,
      },
      validation: matching.validation, // 검증 결과 포함
      submissionStats: {
        submitted: participantAnswers.length,
        notSubmitted: notSubmittedParticipants.length,
        notSubmittedList: notSubmittedParticipants,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();
    const isValidationError =
      normalized.includes('성별 균형 매칭 불가') ||
      normalized.includes('최소 4명의 참가자가 필요');

    logger.error('AI 매칭 실행 실패', {
      cohortId: requestCohortId,
      error: message,
    });

    const status = isValidationError ? 400 : 500;
    return NextResponse.json(
      {
        error: status === 400
          ? '매칭 실행 조건을 충족하지 못했습니다.'
          : '매칭 실행 중 오류가 발생했습니다.',
        message,
      },
      { status }
    );
  }
}

/**
 * GET /api/admin/matching?cohortId=xxx&date=yyyy-mm-dd
 * 특정 날짜의 매칭 결과 조회
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
        {
          error: '해당 날짜의 매칭 결과가 없습니다.',
          availableDates: Object.keys(dailyFeaturedParticipants),
          requestedDate: date,
        },
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

    return NextResponse.json(
      {
        error: '매칭 결과 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
