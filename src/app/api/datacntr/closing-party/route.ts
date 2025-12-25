import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import type { ClosingPartyStats, Cohort, Participant } from '@/types/database';
import { addDays, format, parseISO, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { filterDatacntrParticipant } from '@/lib/datacntr/participant-filter';

export interface ParticipantSubmissionCount {
  participantId: string;
  name: string;
  submissionCount: number;
}

/**
 * GET /api/datacntr/closing-party
 *
 * 클로징 파티 통계 조회
 * - cohortId 쿼리 파라미터 필수
 * - 통계가 없으면 isCalculated: false 반환
 */
export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

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

    // 2. 통계 조회
    const statsDoc = await db
      .collection(COLLECTIONS.CLOSING_PARTY_STATS)
      .doc(cohortId)
      .get();

    // 3. 프로그램 종료 여부 및 계산 가능 시점 확인
    const now = new Date();
    const kstNow = toZonedTime(now, 'Asia/Seoul');
    // endDate는 ISO 문자열 또는 Firestore Timestamp일 수 있음
    const endDate = typeof cohort.endDate === 'string'
      ? parseISO(cohort.endDate)
      : safeTimestampToDate(cohort.endDate) || new Date();
    const programEnded = isAfter(kstNow, endDate);

    // 계산 가능 시점: 종료일 다음날 새벽 3시
    const calculationAvailableAt = format(
      addDays(endDate, 1),
      "yyyy-MM-dd'T'03:00:00+09:00"
    );

    if (statsDoc.exists) {
      // 통계가 있는 경우
      const stats = statsDoc.data() as ClosingPartyStats;

      // 참가자별 인증 횟수 조회
      const participantSubmissions = await getParticipantSubmissionCounts(db, cohortId);

      return NextResponse.json({
        stats,
        isCalculated: true,
        canCalculate: true,
        programEnded,
        calculationAvailableAt,
        participantSubmissions,
      });
    } else {
      // 통계가 없는 경우
      return NextResponse.json({
        stats: null,
        isCalculated: false,
        canCalculate: programEnded,
        programEnded,
        calculationAvailableAt,
        message: programEnded
          ? '통계가 아직 계산되지 않았습니다. 수동 계산을 실행해주세요.'
          : '프로그램이 아직 진행 중입니다. 종료 후 통계가 자동 생성됩니다.',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 참가자별 인증 횟수 조회
 */
async function getParticipantSubmissionCounts(
  db: FirebaseFirestore.Firestore,
  cohortId: string
): Promise<ParticipantSubmissionCount[]> {
  // 1. 참가자 목록 조회 (관리자/고스트 제외)
  const participantsSnapshot = await db
    .collection(COLLECTIONS.PARTICIPANTS)
    .where('cohortId', '==', cohortId)
    .get();

  const participants = participantsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
    .filter((p) => filterDatacntrParticipant(p));

  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const participantIds = Array.from(participantMap.keys());

  // 2. 인증 횟수 조회 (unique submissionDate 기준)
  const submissionCounts = new Map<string, Set<string>>();

  for (const pid of participantIds) {
    submissionCounts.set(pid, new Set());
  }

  // Firestore 'in' 쿼리는 30개 제한
  for (let i = 0; i < participantIds.length; i += 30) {
    const chunk = participantIds.slice(i, i + 30);
    const snapshot = await db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .where('participantId', 'in', chunk)
      .where('status', '==', 'approved')
      .get();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const pid = data.participantId;
      const submissionDate = data.submissionDate;
      if (pid && submissionDate) {
        const dates = submissionCounts.get(pid);
        if (dates) {
          dates.add(submissionDate);
        }
      }
    });
  }

  // 3. 결과 생성 (인증 횟수 내림차순 정렬)
  const result: ParticipantSubmissionCount[] = [];

  for (const [participantId, dates] of submissionCounts) {
    const participant = participantMap.get(participantId);
    if (participant) {
      result.push({
        participantId,
        name: participant.name,
        submissionCount: dates.size,
      });
    }
  }

  // 인증 횟수 내림차순, 같으면 이름 오름차순
  result.sort((a, b) => {
    if (b.submissionCount !== a.submissionCount) {
      return b.submissionCount - a.submissionCount;
    }
    return a.name.localeCompare(b.name, 'ko');
  });

  return result;
}
