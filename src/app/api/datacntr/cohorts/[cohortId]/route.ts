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

    // 슈퍼 관리자 + 고스트 제외 필터링 (일반 관리자는 통계에 포함)
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin && !data.isGhost;
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

    return NextResponse.json(
      { error: '코호트 상세 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/datacntr/cohorts/[cohortId]
 * 코호트 설정 업데이트 (profileUnlockDate 등)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { cohortId } = await params;
    const body = await request.json();
    const { profileUnlockDate } = body;

    // 입력 검증 (ISO 8601 날짜 형식)
    if (profileUnlockDate !== null && profileUnlockDate !== undefined) {
      if (typeof profileUnlockDate !== 'string') {
        return NextResponse.json(
          { error: 'profileUnlockDate는 날짜 문자열이어야 합니다 (YYYY-MM-DD)' },
          { status: 400 }
        );
      }

      // 날짜 형식 검증
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(profileUnlockDate)) {
        return NextResponse.json(
          { error: 'profileUnlockDate는 YYYY-MM-DD 형식이어야 합니다' },
          { status: 400 }
        );
      }
    }

    const db = getAdminDb();

    // Firestore 업데이트
    await db.collection(COLLECTIONS.COHORTS).doc(cohortId).update({
      profileUnlockDate: profileUnlockDate ?? null,
      updatedAt: new Date(),
    });

    logger.info('코호트 프로필 공개 설정 업데이트', {
      cohortId,
      profileUnlockDate,
    });

    return NextResponse.json({ success: true, profileUnlockDate });
  } catch (error) {
    logger.error('코호트 설정 업데이트 실패', error);
    return NextResponse.json(
      { error: '설정 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
