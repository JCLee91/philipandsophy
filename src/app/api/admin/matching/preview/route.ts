import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getMatchingTargetDate, getTodayString } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';
import type { SubmissionData, ParticipantData } from '@/types/database';

/**
 * POST /api/admin/matching/preview
 * AI 매칭 실행 (프리뷰 모드 - Firebase 저장하지 않음)
 */
export async function POST(request: NextRequest) {
  // 내부 서비스 시크릿 검증 (Cron 함수 → Next.js API)
  const internalSecret = request.headers.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  // 시크릿이 일치하면 관리자 인증 우회 (내부 서비스 인증됨)
  let isInternalCall = false;
  if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
    isInternalCall = true;
    logger.info('[Matching Preview] Internal service authenticated via secret');
  }

  // 내부 호출이 아니면 관리자 권한 검증
  if (!isInternalCall) {
    const { user, error } = await requireWebAppAdmin(request);
    if (error) {
      return error;
    }
    logger.info('[Matching Preview] Admin user authenticated', { userId: user.id });
  }

  try {
    const { cohortId } = await request.json();

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 날짜 정의 (새벽 2시 마감 정책 적용)
    const submissionDate = getMatchingTargetDate(); // 매칭 대상 날짜 (새벽 2시 마감 고려)
    const matchingDate = getTodayString(); // 매칭 실행 날짜 (오늘 Firebase 키로 사용)
    const submissionQuestion = getDailyQuestionText(submissionDate);

    logger.info('매칭 날짜 정보', {
      submissionDate,
      matchingDate,
      submissionQuestion: submissionQuestion.substring(0, 50) + '...',
    });

    // 2. Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // 3. 어제 제출한 참가자들의 답변 가져오기 (매칭 대상)
    // 날짜만 확인 (질문은 체크하지 않음 - 새벽 제출자는 다른 질문일 수 있음)
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', submissionDate)
      .get();

    logger.info('제출 현황', {
      totalSubmissions: submissionsSnapshot.size,
      targetDate: submissionDate,
    });

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

    // 4-4. 참가자 정보와 제출물 결합 (질문별로 분리)
    const mainGroupAnswers: ParticipantAnswer[] = []; // 같은 질문 답변자 (13명)
    const dawnGroupAnswers: ParticipantAnswer[] = []; // 다른 질문 답변자 (4명)

    for (const [participantId, submission] of submissionsMap.entries()) {
      const participant = participantDataMap.get(participantId);

      if (!participant) {
        logger.warn('참가자 정보를 찾을 수 없음', { participantId });
        continue;
      }

      // 🔒 다른 코호트 참가자 제외 (다중 코호트 운영 시 데이터 혼입 방지)
      if (!participant.cohortId || participant.cohortId !== cohortId) {
        logger.warn('코호트 불일치로 제외', {
          participantId,
          expectedCohort: cohortId,
          actualCohort: participant.cohortId || 'undefined',
        });
        continue;
      }

      // 슈퍼 관리자만 매칭에서 제외 (일반 관리자는 매칭 대상 포함)
      if (participant.isSuperAdmin) {
        logger.info('슈퍼 관리자 매칭에서 제외', {
          participantId,
          name: participant.name,
        });
        continue;
      }

      const participantAnswer: ParticipantAnswer = {
        id: participantId,
        name: participant.name,
        answer: submission.dailyAnswer,
        gender: participant.gender,
      };

      // 질문별로 그룹 분리
      if (submission.dailyQuestion === submissionQuestion) {
        mainGroupAnswers.push(participantAnswer);
      } else {
        logger.warn('다른 질문에 답변한 참가자 (새벽 제출자)', {
          participantId,
          name: participant.name,
          expectedQuestion: submissionQuestion.substring(0, 30) + '...',
          actualQuestion: submission.dailyQuestion.substring(0, 30) + '...',
        });
        dawnGroupAnswers.push(participantAnswer);
      }
    }

    // 전체 참가자 리스트 (기존 로직 호환성)
    const participantAnswers: ParticipantAnswer[] = [...mainGroupAnswers, ...dawnGroupAnswers];

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
      mainGroupCount: mainGroupAnswers.length,
      dawnGroupCount: dawnGroupAnswers.length,
      mainMaleCount: mainGroupAnswers.filter(p => p.gender === 'male').length,
      mainFemaleCount: mainGroupAnswers.filter(p => p.gender === 'female').length,
    });

    // 6. 임시 매칭 로직: 질문별로 다르게 처리
    let finalMatching: { assignments: any[] };

    if (dawnGroupAnswers.length > 0 && mainGroupAnswers.length >= MATCHING_CONFIG.MIN_PARTICIPANTS) {
      // 6-1. 메인 그룹 (13명) AI 매칭 실행
      logger.info('메인 그룹 AI 매칭 시작', {
        participants: mainGroupAnswers.length,
        question: submissionQuestion.substring(0, 50) + '...'
      });
      const mainGroupMatching = await matchParticipantsByAI(submissionQuestion, mainGroupAnswers);

      // 6-2. 새벽 그룹 (4명)용 랜덤 매칭 생성 (성별 균형 검증 포함)
      logger.info('새벽 그룹 랜덤 매칭 시작', { participants: dawnGroupAnswers.length });

      const dawnAssignments: any[] = [];
      for (const dawnParticipant of dawnGroupAnswers) {
        // 메인 그룹에서 랜덤으로 4명 선택 (각 그룹에서 남녀 1:1)
        const availableMain = [...mainGroupAnswers];
        const males = availableMain.filter(p => p.gender === 'male');
        const females = availableMain.filter(p => p.gender === 'female');

        // Similar: 남자 1명 + 여자 1명 랜덤 선택
        const similarMale = males.sort(() => Math.random() - 0.5).slice(0, 1);
        const similarFemale = females.sort(() => Math.random() - 0.5).slice(0, 1);
        const similarPicks = [...similarMale, ...similarFemale];

        // Opposite: 남자 1명 + 여자 1명 랜덤 선택 (similar와 중복되지 않도록)
        const usedIds = new Set(similarPicks.map(p => p.id));
        const oppositeMale = males.filter(p => !usedIds.has(p.id)).sort(() => Math.random() - 0.5).slice(0, 1);
        const oppositeFemale = females.filter(p => !usedIds.has(p.id)).sort(() => Math.random() - 0.5).slice(0, 1);
        const oppositePicks = [...oppositeMale, ...oppositeFemale];

        const similarIds = similarPicks.map(p => p.id);
        const oppositeIds = oppositePicks.map(p => p.id);

        // 성별 균형 검증
        const similarBalanced = similarPicks.length === 2 &&
          similarPicks.filter(p => p.gender === 'male').length === 1 &&
          similarPicks.filter(p => p.gender === 'female').length === 1;

        const oppositeBalanced = oppositePicks.length === 2 &&
          oppositePicks.filter(p => p.gender === 'male').length === 1 &&
          oppositePicks.filter(p => p.gender === 'female').length === 1;

        if (!similarBalanced || !oppositeBalanced) {
          logger.warn('새벽 참가자 성별 균형 미달', {
            participantId: dawnParticipant.id,
            name: dawnParticipant.name,
            similarBalanced,
            oppositeBalanced,
            similarCount: similarPicks.length,
            oppositeCount: oppositePicks.length
          });
        }

        dawnAssignments.push({
          participantId: dawnParticipant.id,
          similar: similarIds,
          opposite: oppositeIds,
          reasons: {
            similar: '랜덤 매칭 (남녀 각 1명)',
            opposite: '랜덤 매칭 (남녀 각 1명)',
            overall: '새벽 제출자를 위한 임시 랜덤 매칭'
          }
        });

        logger.info('새벽 참가자 랜덤 매칭 완료', {
          participantId: dawnParticipant.id,
          name: dawnParticipant.name,
          assignedBooks: similarIds.length + oppositeIds.length,
          similarBalanced,
          oppositeBalanced
        });
      }

      // 6-3. 두 그룹 결과 합치기
      // 새벽 그룹 매칭을 메인 그룹 매칭 Record에 추가
      const combinedAssignments = { ...mainGroupMatching.assignments };

      for (const dawnAssignment of dawnAssignments) {
        combinedAssignments[dawnAssignment.participantId] = {
          similar: dawnAssignment.similar,
          opposite: dawnAssignment.opposite,
          reasons: dawnAssignment.reasons
        };
      }

      finalMatching = {
        assignments: combinedAssignments
      };

      logger.info('임시 매칭 완료', {
        mainGroupMatches: Object.keys(mainGroupMatching.assignments).length,
        dawnGroupMatches: dawnAssignments.length,
        totalMatches: Object.keys(combinedAssignments).length
      });

    } else {
      // 일반 매칭 (모두 같은 질문에 답변한 경우)
      logger.info('일반 AI 매칭 시작 (프리뷰 모드)', { totalParticipants: participantAnswers.length });
      finalMatching = await matchParticipantsByAI(submissionQuestion, participantAnswers);
      logger.info('AI 매칭 완료 (프리뷰 모드)');
    }

    const matching = finalMatching;

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
        // 슈퍼 관리자 제외 + 제출 안 한 사람만 (일반 관리자는 포함)
        return !submittedIds.has(doc.id) && !participant.isSuperAdmin;
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
