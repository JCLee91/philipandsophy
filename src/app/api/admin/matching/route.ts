import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getTodayString, getYesterdayString } from '@/lib/date-utils';
import { requireAdmin } from '@/lib/api-auth';
import { requireAdminWithRateLimit } from '@/lib/api-middleware';
import { validateParticipantGenderDistribution } from '@/lib/matching-validation';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';

interface SubmissionData {
  participantId: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submissionDate: string;
}

interface ParticipantData {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  isAdmin?: boolean;
  isAdministrator?: boolean;
  cohortId: string;
}

/**
 * POST /api/admin/matching
 * AI 매칭 실행 API
 */
export async function POST(request: NextRequest) {
  // 관리자 권한 + Rate limit 검증
  const { user, error } = await requireAdminWithRateLimit(request);
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

    // 4. 성별 데이터 및 분포 검증
    const genderValidation = validateParticipantGenderDistribution(participantAnswers);

    if (!genderValidation.valid) {
      logger.error('성별 검증 실패', {
        missingGenderCount: genderValidation.missingGender.length,
        maleCount: genderValidation.maleCount,
        femaleCount: genderValidation.femaleCount,
        requiredPerGender: genderValidation.requiredPerGender,
        errors: genderValidation.errors,
      });

      return NextResponse.json(
        {
          error: genderValidation.errors[0],
          genderDistribution: {
            male: genderValidation.maleCount,
            female: genderValidation.femaleCount,
            required: genderValidation.requiredPerGender,
          },
        },
        { status: 400 }
      );
    }

    logger.info('성별 분포 검증 통과', {
      maleCount: genderValidation.maleCount,
      femaleCount: genderValidation.femaleCount,
      totalCount: participantAnswers.length,
    });

    // 5. AI 매칭 수행
    const matching = await matchParticipantsByAI(yesterdayQuestion, participantAnswers);

    // 6. Cohort 문서에 매칭 결과 저장 (Transaction으로 race condition 방지)
    const cohortRef = db.collection('cohorts').doc(cohortId);

    try {
      await db.runTransaction(async (transaction) => {
        const cohortDoc = await transaction.get(cohortRef);

        if (!cohortDoc.exists) {
          throw new Error('Cohort를 찾을 수 없습니다.');
        }

        const cohortData = cohortDoc.data();
        const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

        // 어제 날짜 키로 매칭 결과 저장 (참가자들이 "오늘의 서재"에서 확인)
        dailyFeaturedParticipants[yesterday] = matching;

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

    // 6. 매칭 결과 요약 생성
    const participantNameMap = new Map(
      participantAnswers.map((p) => [p.id, p.name] as const)
    );
    const featuredSimilarIds = matching.featured?.similar ?? [];
    const featuredOppositeIds = matching.featured?.opposite ?? [];

    const featuredSimilarParticipants = featuredSimilarIds.map((id) => ({
      id,
      name: participantNameMap.get(id) ?? '알 수 없음',
    }));
    const featuredOppositeParticipants = featuredOppositeIds.map((id) => ({
      id,
      name: participantNameMap.get(id) ?? '알 수 없음',
    }));

    return NextResponse.json({
      success: true,
      date: yesterday,
      question: yesterdayQuestion,
      totalParticipants: participantAnswers.length,
      matching,
      featuredParticipants: {
        similar: featuredSimilarParticipants,
        opposite: featuredOppositeParticipants,
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

    const normalizedMatching =
      'featured' in matchingEntry || 'assignments' in matchingEntry
        ? {
            featured: {
              similar: matchingEntry.featured?.similar ?? [],
              opposite: matchingEntry.featured?.opposite ?? [],
              reasons: matchingEntry.featured?.reasons,
            },
            assignments: matchingEntry.assignments ?? {},
          }
        : {
            featured: {
              similar: matchingEntry.similar ?? [],
              opposite: matchingEntry.opposite ?? [],
              reasons: matchingEntry.reasons,
            },
            assignments: {},
          };

    // 참가자 이름 정보 가져오기 (Batch read로 N+1 쿼리 최적화)
    const featuredSimilarIds = normalizedMatching.featured?.similar ?? [];
    const featuredOppositeIds = normalizedMatching.featured?.opposite ?? [];
    const participantIds = [...featuredSimilarIds, ...featuredOppositeIds];

    // Batch read (최대 10개씩)
    const participantDataMap = new Map<string, { id: string; name: string }>();

    for (let i = 0; i < participantIds.length; i += MATCHING_CONFIG.BATCH_SIZE) {
      const batchIds = participantIds.slice(i, i + MATCHING_CONFIG.BATCH_SIZE);
      const participantDocs = await db
        .collection('participants')
        .where(admin.firestore.FieldPath.documentId(), 'in', batchIds)
        .get();

      participantDocs.docs.forEach((doc) => {
        participantDataMap.set(doc.id, {
          id: doc.id,
          name: doc.data()?.name ?? '알 수 없음'
        });
      });
    }

    // ID로 참가자 정보 매핑 (없으면 기본값)
    const similarParticipants = featuredSimilarIds.map((id) =>
      participantDataMap.get(id) ?? { id, name: '알 수 없음' }
    );
    const oppositeParticipants = featuredOppositeIds.map((id) =>
      participantDataMap.get(id) ?? { id, name: '알 수 없음' }
    );

    return NextResponse.json({
      success: true,
      date,
      question: getDailyQuestionText(date),
      matching: normalizedMatching,
      featuredParticipants: {
        similar: similarParticipants,
        opposite: oppositeParticipants,
      },
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
