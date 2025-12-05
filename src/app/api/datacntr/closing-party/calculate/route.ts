import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import type { Cohort, Participant, ReadingSubmission, ClosingPartyStats } from '@/types/database';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * POST /api/datacntr/closing-party/calculate
 *
 * 클로징 파티 통계 수동 계산
 * - cohortId 필수
 * - 프로그램 종료 후에만 계산 가능
 */
export async function POST(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { cohortId } = body;

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 1. 코호트 정보 조회
    const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: '코호트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const cohort = { id: cohortDoc.id, ...cohortDoc.data() } as Cohort;

    // 2. 통계 계산
    logger.info(`Calculating closing party stats for cohort: ${cohortId}`);
    const stats = await calculateStats(db, cohort);

    // 3. 저장
    await db.collection(COLLECTIONS.CLOSING_PARTY_STATS).doc(cohortId).set(stats);

    return NextResponse.json({
      success: true,
      stats,
      message: '통계가 성공적으로 계산되었습니다.',
    });
  } catch (error) {
    logger.error('통계 계산 실패:', error);
    return NextResponse.json(
      { error: '통계 계산 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 통계 계산 로직
 */
async function calculateStats(
  db: FirebaseFirestore.Firestore,
  cohort: Cohort
): Promise<ClosingPartyStats> {
  const cohortId = cohort.id;

  // 1. 참가자 목록 조회 (관리자/고스트 제외)
  const participantsSnapshot = await db
    .collection(COLLECTIONS.PARTICIPANTS)
    .where('cohortId', '==', cohortId)
    .get();

  const participants = participantsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
    .filter((p) => !p.isAdministrator && !p.isSuperAdmin && !p.isGhost);

  const participantMap = new Map(participants.map((p) => [p.id, p]));

  // 2. 인증 데이터 조회 (approved만)
  // 기존 데이터에 cohortId가 없을 수 있으므로 participantId로 조회
  const participantIds = Array.from(participantMap.keys());
  const submissions: ReadingSubmission[] = [];

  // Firestore 'in' 쿼리는 30개 제한
  for (let i = 0; i < participantIds.length; i += 30) {
    const chunk = participantIds.slice(i, i + 30);
    const snapshot = await db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .where('participantId', 'in', chunk)
      .where('status', '==', 'approved')
      .get();

    snapshot.docs.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() } as ReadingSubmission);
    });
  }

  // 3. 프로그램 기간 계산 (OT 제외 13일)
  const programStartDate = cohort.programStartDate || cohort.startDate;
  const firstSubmissionDate = format(addDays(parseISO(programStartDate), 1), 'yyyy-MM-dd');
  const totalDays = differenceInDays(parseISO(cohort.endDate), parseISO(firstSubmissionDate)) + 1;

  // 인증 가능한 날짜 배열 생성
  const allDates: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    allDates.push(format(addDays(parseISO(firstSubmissionDate), i), 'yyyy-MM-dd'));
  }

  // 4. 각 통계 항목 계산
  const earliestSubmitter = findEarliestSubmitter(submissions, participantMap);
  const latestSubmitter = findLatestSubmitter(submissions, participantMap);
  const mostBooksReader = findMostBooksReader(submissions, participantMap);
  const longestReviewWriter = findLongestReviewWriter(submissions, participantMap);
  const longestAnswerWriter = findLongestAnswerWriter(submissions, participantMap);
  const { perfectAttendance, almostPerfectAttendance } = findAttendanceAwards(
    submissions,
    participantMap,
    allDates,
    totalDays
  );

  // ClosingPartyStats 타입과 호환되도록 any 사용 (Admin SDK vs Client SDK Timestamp 차이)
  return {
    id: cohortId,
    cohortId,
    cohortName: cohort.name,
    programPeriod: {
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      totalDays,
    },
    earliestSubmitter,
    latestSubmitter,
    mostBooksReader,
    longestReviewWriter,
    longestAnswerWriter,
    perfectAttendance,
    almostPerfectAttendance,
    calculatedAt: Timestamp.now() as any,
    calculatedBy: 'manual',
    totalParticipants: participants.length,
    totalSubmissions: submissions.length,
  } as ClosingPartyStats;
}

// 얼리버드상
function findEarliestSubmitter(
  submissions: ReadingSubmission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['earliestSubmitter'] {
  let earliest: ReadingSubmission | null = null;
  let earliestMinutes = Infinity;

  for (const submission of submissions) {
    if (!submission.submittedAt) continue;

    const submittedDate = submission.submittedAt.toDate();
    const kstTime = toZonedTime(submittedDate, 'Asia/Seoul');
    const hour = kstTime.getHours();

    // 6시 이전은 제외 (얼리버드 대상 아님)
    if (hour < 6) continue;

    const minutesFromDayStart = (hour - 6) * 60 + kstTime.getMinutes();

    if (minutesFromDayStart < earliestMinutes) {
      earliestMinutes = minutesFromDayStart;
      earliest = submission;
    }
  }

  if (!earliest || !earliest.submittedAt) return null;

  const participant = participantMap.get(earliest.participantId);
  if (!participant) return null;

  const kstTime = toZonedTime(earliest.submittedAt.toDate(), 'Asia/Seoul');

  return {
    participantId: earliest.participantId,
    participantName: participant.name,
    submissionTime: format(kstTime, 'HH:mm:ss'),
    submissionDate: earliest.submissionDate || format(kstTime, 'yyyy-MM-dd'),
  };
}

// 올빼미상
function findLatestSubmitter(
  submissions: ReadingSubmission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['latestSubmitter'] {
  let latest: ReadingSubmission | null = null;
  let latestMinutes = -1;

  for (const submission of submissions) {
    if (!submission.submittedAt) continue;

    const submittedDate = submission.submittedAt.toDate();
    const kstTime = toZonedTime(submittedDate, 'Asia/Seoul');
    const hour = kstTime.getHours();

    let minutesFromDayStart: number;
    if (hour >= 2) {
      minutesFromDayStart = (hour - 2) * 60 + kstTime.getMinutes();
    } else {
      minutesFromDayStart = (22 + hour) * 60 + kstTime.getMinutes();
    }

    if (minutesFromDayStart > latestMinutes) {
      latestMinutes = minutesFromDayStart;
      latest = submission;
    }
  }

  if (!latest || !latest.submittedAt) return null;

  const participant = participantMap.get(latest.participantId);
  if (!participant) return null;

  const kstTime = toZonedTime(latest.submittedAt.toDate(), 'Asia/Seoul');

  return {
    participantId: latest.participantId,
    participantName: participant.name,
    submissionTime: format(kstTime, 'HH:mm:ss'),
    submissionDate: latest.submissionDate || format(kstTime, 'yyyy-MM-dd'),
  };
}

// 다독왕
function findMostBooksReader(
  submissions: ReadingSubmission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['mostBooksReader'] {
  const booksByParticipant = new Map<string, Set<string>>();

  for (const submission of submissions) {
    if (!submission.bookTitle) continue;

    const books = booksByParticipant.get(submission.participantId) || new Set();
    books.add(submission.bookTitle.trim());
    booksByParticipant.set(submission.participantId, books);
  }

  let maxBooks = 0;
  let winner: { participantId: string; books: Set<string> } | null = null;

  for (const [participantId, books] of booksByParticipant) {
    if (books.size > maxBooks) {
      maxBooks = books.size;
      winner = { participantId, books };
    }
  }

  if (!winner || maxBooks === 0) return null;

  const participant = participantMap.get(winner.participantId);
  if (!participant) return null;

  return {
    participantId: winner.participantId,
    participantName: participant.name,
    uniqueBookCount: maxBooks,
    bookTitles: Array.from(winner.books),
  };
}

// 감상평왕
function findLongestReviewWriter(
  submissions: ReadingSubmission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['longestReviewWriter'] {
  const reviewStats = new Map<string, { total: number; count: number }>();

  for (const submission of submissions) {
    if (!submission.review) continue;

    const length = submission.review.length;
    const stats = reviewStats.get(submission.participantId) || { total: 0, count: 0 };
    stats.total += length;
    stats.count += 1;
    reviewStats.set(submission.participantId, stats);
  }

  let maxAverage = 0;
  let winner: { participantId: string; average: number; count: number } | null = null;

  for (const [participantId, stats] of reviewStats) {
    const average = stats.total / stats.count;
    if (average > maxAverage) {
      maxAverage = average;
      winner = { participantId, average, count: stats.count };
    }
  }

  if (!winner) return null;

  const participant = participantMap.get(winner.participantId);
  if (!participant) return null;

  return {
    participantId: winner.participantId,
    participantName: participant.name,
    averageLength: Math.round(winner.average),
    totalSubmissions: winner.count,
  };
}

// 가치관왕
function findLongestAnswerWriter(
  submissions: ReadingSubmission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['longestAnswerWriter'] {
  const answerStats = new Map<string, { total: number; count: number }>();

  for (const submission of submissions) {
    if (!submission.dailyAnswer) continue;

    const length = submission.dailyAnswer.length;
    const stats = answerStats.get(submission.participantId) || { total: 0, count: 0 };
    stats.total += length;
    stats.count += 1;
    answerStats.set(submission.participantId, stats);
  }

  let maxAverage = 0;
  let winner: { participantId: string; average: number; count: number } | null = null;

  for (const [participantId, stats] of answerStats) {
    const average = stats.total / stats.count;
    if (average > maxAverage) {
      maxAverage = average;
      winner = { participantId, average, count: stats.count };
    }
  }

  if (!winner) return null;

  const participant = participantMap.get(winner.participantId);
  if (!participant) return null;

  return {
    participantId: winner.participantId,
    participantName: participant.name,
    averageLength: Math.round(winner.average),
    totalSubmissions: winner.count,
  };
}

// 개근상 & 준개근상
function findAttendanceAwards(
  submissions: ReadingSubmission[],
  participantMap: Map<string, Participant>,
  allDates: string[],
  totalDays: number
): {
  perfectAttendance: ClosingPartyStats['perfectAttendance'];
  almostPerfectAttendance: ClosingPartyStats['almostPerfectAttendance'];
} {
  const datesByParticipant = new Map<string, Set<string>>();

  for (const submission of submissions) {
    if (!submission.submissionDate) continue;

    const dates = datesByParticipant.get(submission.participantId) || new Set();
    dates.add(submission.submissionDate);
    datesByParticipant.set(submission.participantId, dates);
  }

  const perfectAttendance: ClosingPartyStats['perfectAttendance'] = [];
  const almostPerfectAttendance: ClosingPartyStats['almostPerfectAttendance'] = [];

  for (const [participantId, dates] of datesByParticipant) {
    const participant = participantMap.get(participantId);
    if (!participant) continue;

    const submissionCount = dates.size;

    if (submissionCount === totalDays) {
      perfectAttendance.push({
        participantId,
        participantName: participant.name,
      });
    } else if (submissionCount === totalDays - 1) {
      const missedDate = allDates.find((date) => !dates.has(date));
      if (missedDate) {
        almostPerfectAttendance.push({
          participantId,
          participantName: participant.name,
          missedDate,
        });
      }
    }
  }

  return { perfectAttendance, almostPerfectAttendance };
}
