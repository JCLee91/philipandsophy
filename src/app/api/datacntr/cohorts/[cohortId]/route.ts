import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { sanitizeParticipantForClient } from '@/lib/datacntr/sanitize';
import type { CohortParticipant } from '@/types/datacntr';

interface RouteParams {
  params: Promise<{ cohortId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { cohortId } = await params;
    const db = getAdminDb();

    // 코호트 정보 조회
    const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();

    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: '코호트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const cohort = {
      id: cohortDoc.id,
      ...cohortDoc.data(),
    };

    // 코호트 참가자 조회
    const participantsSnapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('cohortId', '==', cohortId)
      .get();

    // 슈퍼 관리자 제외 필터링 (일반 관리자는 통계에 포함)
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin;
    });

    // 각 참가자의 인증 횟수 조회 (관리자 제외)
    const participantsWithStats: CohortParticipant[] = await Promise.all(
      nonAdminParticipants.map(async (doc) => {
        const participantData = doc.data();

        // 해당 참가자의 인증 횟수 조회
        const submissionsSnapshot = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', '==', doc.id)
          .get();

        return {
          ...sanitizeParticipantForClient({ id: doc.id, ...participantData }),
          submissionCount: submissionsSnapshot.size,
        };
      })
    );

    return NextResponse.json({
      cohort,
      participants: participantsWithStats,
    });
  } catch (error) {
    logger.error('코호트 상세 조회 실패 (datacntr-cohort-detail)', error);
    return NextResponse.json(
      { error: '코호트 상세 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
