import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import type { ClosingPartyStats, Cohort } from '@/types/database';
import { addDays, format, parseISO, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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
    const endDate = parseISO(cohort.endDate);
    const programEnded = isAfter(kstNow, endDate);

    // 계산 가능 시점: 종료일 다음날 새벽 3시
    const calculationAvailableAt = format(
      addDays(endDate, 1),
      "yyyy-MM-dd'T'03:00:00+09:00"
    );

    if (statsDoc.exists) {
      // 통계가 있는 경우
      const stats = statsDoc.data() as ClosingPartyStats;

      return NextResponse.json({
        stats,
        isCalculated: true,
        canCalculate: true,
        programEnded,
        calculationAvailableAt,
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
