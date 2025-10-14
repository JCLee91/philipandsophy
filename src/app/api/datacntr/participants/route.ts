import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const { email, uid, error } = await requireAuthToken(request);
    if (error) {
      return error;
    }

    const db = getAdminDb();

    // 모든 참가자 조회
    const participantsSnapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .orderBy('createdAt', 'desc')
      .get();

    // 관리자 제외 필터링
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isAdmin && !data.isAdministrator;
    });

    // 코호트 정보 맵 생성
    const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
    const cohortsMap = new Map();
    cohortsSnapshot.docs.forEach((doc) => {
      cohortsMap.set(doc.id, doc.data().name);
    });

    // 각 참가자의 인증 횟수 및 코호트명 추가 (관리자 제외)
    const participantsWithStats = await Promise.all(
      nonAdminParticipants.map(async (doc) => {
        const participantData = doc.data();

        // 해당 참가자의 인증 횟수 조회
        const submissionsSnapshot = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', '==', doc.id)
          .get();

        return {
          id: doc.id,
          ...participantData,
          cohortName: cohortsMap.get(participantData.cohortId) || '알 수 없음',
          submissionCount: submissionsSnapshot.size,
        };
      })
    );

    return NextResponse.json(participantsWithStats);
  } catch (error) {
    logger.error('참가자 조회 실패 (datacntr-participants)', error);
    return NextResponse.json(
      { error: '참가자 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
