import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // 모든 독서 인증 조회 (최신순)
    const submissionsSnapshot = await db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .orderBy('submittedAt', 'desc')
      .limit(200) // 최대 200개만 조회 (성능 고려)
      .get();

    // 참가자 정보 맵 생성
    const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
    const participantsMap = new Map();
    const superAdminIds = new Set<string>();

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      participantsMap.set(doc.id, {
        name: data.name,
        cohortId: data.cohortId,
      });

      // 슈퍼관리자 ID만 수집 (일반 관리자는 포함)
      if (data.isSuperAdmin) {
        superAdminIds.add(doc.id);
      }
    });

    // 코호트 정보 맵 생성
    const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
    const cohortsMap = new Map();
    cohortsSnapshot.docs.forEach((doc) => {
      cohortsMap.set(doc.id, doc.data().name);
    });

    // 인증 데이터에 참가자명 및 코호트명 추가 (슈퍼관리자 인증만 제외)
    const submissionsWithParticipant = submissionsSnapshot.docs
      .filter((doc) => {
        const submissionData = doc.data();
        // 슈퍼관리자 인증만 제외 (일반 관리자는 포함)
        return !superAdminIds.has(submissionData.participantId);
      })
      .map((doc) => {
        const submissionData = doc.data();
        const participant = participantsMap.get(submissionData.participantId);

        return {
          id: doc.id,
          ...submissionData,
          participantName: participant?.name || '알 수 없음',
          cohortName: cohortsMap.get(participant?.cohortId) || '알 수 없음',
        };
      });

    return NextResponse.json(submissionsWithParticipant);
  } catch (error) {
    logger.error('독서 인증 조회 실패 (datacntr-submissions)', error);
    return NextResponse.json(
      { error: '독서 인증 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
