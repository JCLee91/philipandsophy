import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getYesterdayString, getTodayString } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';
import type { SubmissionData, ParticipantData } from '@/types/database';

/**
 * POST /api/admin/matching/preview
 * AI 매칭 실행 (프리뷰 모드 - Firebase 저장하지 않음)
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

    // 1. 날짜 정의
    const submissionDate = getYesterdayString(); // 제출 날짜 (어제 데이터)
    const matchingDate = getTodayString(); // 매칭 실행 날짜 (오늘 Firebase 키로 사용)
    const submissionQuestion = getDailyQuestionText(submissionDate);

    // 2. Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // 3. 어제 제출한 참가자들의 답변 가져오기 (매칭 대상)
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', submissionDate)
      .where('dailyQuestion', '==', submissionQuestion)
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

    // 4. 참가자 정보와 답변 수집 (Batch read로 N+1 쿼리 최적화)
    const participantAnswers: ParticipantAnswer[] = [];
    const submissionsMap = new Map<string, SubmissionData>();

    // 4-1. 중복 제거 및 제출물 수집
    for (const doc of submissionsSnapshot.docs) {
      const submission = doc.data() as SubmissionData;
      submissionsMap.set(submission.participantId, submission);
    }

    // 4-2. 참가자 ID 목록 추출
    const uniqueParticipantIds = Array.from(submissionsMap.keys());

    // 4-3. Batch read로 모든 참가자 정보 한 번에 가져오기 (최대 10개씩)
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

    // 4-4. 참가자 정보와 제출물 결합
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

    // 5. 필터링 후 참가자 수 재검증 (AI 최소 인원 조건)
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

    logger.info('매칭 프리뷰 시작 (Human-in-the-loop)', {
      totalCount: participantAnswers.length,
      maleCount: participantAnswers.filter(p => p.gender === 'male').length,
      femaleCount: participantAnswers.filter(p => p.gender === 'female').length,
    });

    // 6. AI 매칭 수행 (검증 없음 - 관리자가 수동으로 검토/조정)
    logger.info('AI 매칭 시작 (프리뷰 모드)', { totalParticipants: participantAnswers.length });
    const matching = await matchParticipantsByAI(submissionQuestion, participantAnswers);
    logger.info('AI 매칭 완료 (프리뷰 모드)');

    // 7. ⚠️ Firebase 저장하지 않음 (프리뷰 모드)
    // 매칭 결과를 response로만 반환

    // 전체 코호트 참가자 ID 목록 (제출 여부 구분용)
    const allCohortParticipantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    const submittedIds = new Set(participantAnswers.map(p => p.id));
    const notSubmittedParticipants = allCohortParticipantsSnapshot.docs
      .filter(doc => {
        const participant = doc.data() as ParticipantData;
        // 관리자 제외 + 제출 안 한 사람만
        return !submittedIds.has(doc.id) &&
               !(participant.isAdmin || participant.isAdministrator);
      })
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));

    return NextResponse.json({
      success: true,
      preview: true, // 프리뷰 모드 플래그
      date: matchingDate, // 매칭 날짜 (오늘, Firebase 키로 사용)
      submissionDate, // 제출 날짜 (어제, 스포일러 방지용)
      question: submissionQuestion,
      totalParticipants: participantAnswers.length,
      matching,
      submissionStats: {
        submitted: participantAnswers.length,
        notSubmitted: notSubmittedParticipants.length,
        notSubmittedList: notSubmittedParticipants,
      },
    });

  } catch (error) {
    logger.error('매칭 프리뷰 실패', error);
    return NextResponse.json(
      {
        error: '매칭 실행 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
