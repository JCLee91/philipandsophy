/**
 * 클로징 파티 통계 계산 로직
 *
 * 프로그램 종료 후 다음 통계 항목들을 계산:
 * 1. 얼리버드상: 오전 6시 이후 가장 빠른 인증
 * 2. 올빼미상: 마감 직전 가장 늦은 인증
 * 3. 다독왕: 가장 많은 종류의 책
 * 4. 감상평왕: 평균 감상평 길이
 * 5. 가치관왕: 평균 가치관 답변 길이
 * 6. 개근상: 13일 전부 인증 (OT 제외)
 * 7. 준개근상: 12일 인증
 *
 * @version 1.0.0
 * @date 2025-12-05
 */

import * as admin from 'firebase-admin';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { logger } from '../logger';

// Types
interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  programStartDate?: string;
}

interface Participant {
  id: string;
  name: string;
  cohortId: string;
  isAdministrator?: boolean;
  isSuperAdmin?: boolean;
  isGhost?: boolean;
}

interface Submission {
  id: string;
  participantId: string;
  bookTitle?: string;
  review?: string;
  dailyAnswer?: string;
  submittedAt?: admin.firestore.Timestamp;
  submissionDate?: string;
  status: string;
}

interface ClosingPartyStats {
  id: string;
  cohortId: string;
  cohortName: string;
  programPeriod: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  earliestSubmitter: {
    participantId: string;
    participantName: string;
    submissionTime: string;
    submissionDate: string;
  } | null;
  latestSubmitter: {
    participantId: string;
    participantName: string;
    submissionTime: string;
    submissionDate: string;
  } | null;
  mostBooksReader: {
    participantId: string;
    participantName: string;
    uniqueBookCount: number;
    bookTitles: string[];
  } | null;
  longestReviewWriter: {
    participantId: string;
    participantName: string;
    averageLength: number;
    totalSubmissions: number;
  } | null;
  longestAnswerWriter: {
    participantId: string;
    participantName: string;
    averageLength: number;
    totalSubmissions: number;
  } | null;
  perfectAttendance: Array<{
    participantId: string;
    participantName: string;
  }>;
  almostPerfectAttendance: Array<{
    participantId: string;
    participantName: string;
    missedDate: string;
  }>;
  calculatedAt: admin.firestore.Timestamp;
  calculatedBy: 'scheduled' | 'manual';
  totalParticipants: number;
  totalSubmissions: number;
}

/**
 * 클로징 파티 통계 계산
 */
export async function calculateClosingPartyStats(
  db: admin.firestore.Firestore,
  cohortId: string,
  calculatedBy: 'scheduled' | 'manual' = 'scheduled'
): Promise<ClosingPartyStats> {
  logger.info(`Calculating closing party stats for cohort: ${cohortId}`);

  // 1. 코호트 정보 조회
  const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
  if (!cohortDoc.exists) {
    throw new Error(`Cohort ${cohortId} not found`);
  }
  const cohort = { id: cohortDoc.id, ...cohortDoc.data() } as Cohort;

  // 2. 참가자 목록 조회 (관리자/고스트 제외)
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  const participants = participantsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
    .filter((p) => !p.isAdministrator && !p.isSuperAdmin && !p.isGhost);

  const participantMap = new Map(participants.map((p) => [p.id, p]));
  logger.info(`Found ${participants.length} eligible participants`);

  // 3. 인증 데이터 조회 (approved만)
  // 기존 데이터에 cohortId가 없을 수 있으므로 participantId로 조회
  const participantIds = Array.from(participantMap.keys());
  const submissions: Submission[] = [];

  // Firestore 'in' 쿼리는 30개 제한
  for (let i = 0; i < participantIds.length; i += 30) {
    const chunk = participantIds.slice(i, i + 30);
    const snapshot = await db
      .collection('reading_submissions')
      .where('participantId', 'in', chunk)
      .where('status', '==', 'approved')
      .get();

    snapshot.docs.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() } as Submission);
    });
  }

  logger.info(`Found ${submissions.length} submissions`);

  // 4. 프로그램 기간 계산 (OT 제외 13일)
  const programStartDate = cohort.programStartDate || cohort.startDate;
  const firstSubmissionDate = format(addDays(parseISO(programStartDate), 1), 'yyyy-MM-dd'); // Day 2부터
  const totalDays = differenceInDays(parseISO(cohort.endDate), parseISO(firstSubmissionDate)) + 1;

  // 인증 가능한 날짜 배열 생성 (Day 2 ~ Day 14)
  const allDates: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    allDates.push(format(addDays(parseISO(firstSubmissionDate), i), 'yyyy-MM-dd'));
  }

  logger.info(`Program dates: ${firstSubmissionDate} ~ ${cohort.endDate} (${totalDays} days)`);

  // 5. 각 통계 항목 계산
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

  // 6. 결과 생성
  const stats: ClosingPartyStats = {
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
    calculatedAt: admin.firestore.Timestamp.now(),
    calculatedBy,
    totalParticipants: participants.length,
    totalSubmissions: submissions.length,
  };

  // 7. Firestore에 저장
  await db.collection('closing_party_stats').doc(cohortId).set(stats);
  logger.info(`Closing party stats saved for cohort: ${cohortId}`);

  return stats;
}

/**
 * 얼리버드상: 오전 6시 이후 가장 빠른 인증
 */
function findEarliestSubmitter(
  submissions: Submission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['earliestSubmitter'] {
  let earliest: Submission | null = null;
  let earliestMinutes = Infinity;

  for (const submission of submissions) {
    if (!submission.submittedAt) continue;

    const kstTime = toZonedTime(submission.submittedAt.toDate(), 'Asia/Seoul');
    const hour = kstTime.getHours();

    // 6시 이전은 제외 (얼리버드 대상 아님)
    if (hour < 6) continue;

    // 6시부터의 분 계산
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

/**
 * 올빼미상: 마감 직전 가장 늦은 인증
 */
function findLatestSubmitter(
  submissions: Submission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['latestSubmitter'] {
  let latest: Submission | null = null;
  let latestMinutes = -1;

  for (const submission of submissions) {
    if (!submission.submittedAt) continue;

    const kstTime = toZonedTime(submission.submittedAt.toDate(), 'Asia/Seoul');
    const hour = kstTime.getHours();

    // 새벽 2시 기준으로 하루 시작
    // 하루의 끝은 새벽 2시 직전 (01:59:59)
    let minutesFromDayStart: number;

    if (hour >= 2) {
      // 02:00~23:59
      minutesFromDayStart = (hour - 2) * 60 + kstTime.getMinutes();
    } else {
      // 00:00~01:59 (마감 직전)
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

/**
 * 다독왕: 가장 많은 종류의 책
 */
function findMostBooksReader(
  submissions: Submission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['mostBooksReader'] {
  // 참가자별 고유 책 목록
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

/**
 * 감상평왕: 평균 감상평 길이
 */
function findLongestReviewWriter(
  submissions: Submission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['longestReviewWriter'] {
  // 참가자별 감상평 길이 합계 및 개수
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

/**
 * 가치관왕: 평균 가치관 답변 길이
 */
function findLongestAnswerWriter(
  submissions: Submission[],
  participantMap: Map<string, Participant>
): ClosingPartyStats['longestAnswerWriter'] {
  // 참가자별 답변 길이 합계 및 개수
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

/**
 * 개근상 & 준개근상
 */
function findAttendanceAwards(
  submissions: Submission[],
  participantMap: Map<string, Participant>,
  allDates: string[],
  totalDays: number
): {
  perfectAttendance: ClosingPartyStats['perfectAttendance'];
  almostPerfectAttendance: ClosingPartyStats['almostPerfectAttendance'];
} {
  // 참가자별 인증 날짜 Set
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
      // 개근상: 모든 날짜 인증
      perfectAttendance.push({
        participantId,
        participantName: participant.name,
      });
    } else if (submissionCount === totalDays - 1) {
      // 준개근상: 하루만 빠짐
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
