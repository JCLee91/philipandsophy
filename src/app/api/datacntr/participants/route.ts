import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { calculateEngagementScore, getEngagementLevel, getWeeksPassed } from '@/lib/datacntr/engagement';
import { sanitizeParticipantForClient } from '@/lib/datacntr/sanitize';
import { getParticipantStatus } from '@/lib/datacntr/status';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';

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

    // 코호트 정보 맵 생성 (이름 + 시작일)
    const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
    const cohortsMap = new Map<string, { name: string; startDate: Date | null }>();
    cohortsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      cohortsMap.set(doc.id, {
        name: data.name || '알 수 없음',
        startDate: safeTimestampToDate(data.startDate),
      });
    });

    // 각 참가자의 인증 횟수, 인게이지먼트, 활동 상태 추가 (관리자 제외)
    const now = Date.now();
    const participantsWithStats = await Promise.all(
      nonAdminParticipants.map(async (doc) => {
        const participantData = doc.data();

        // 해당 참가자의 인증 횟수 조회
        const submissionsSnapshot = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', '==', doc.id)
          .get();

        const submissionCount = submissionsSnapshot.size;

        // 코호트 정보 가져오기
        const cohort = cohortsMap.get(participantData.cohortId);
        const cohortName = cohort?.name || '알 수 없음';

        // 인게이지먼트 점수 계산
        let engagementScore = 0;
        let engagementLevel: 'high' | 'medium' | 'low' = 'low';
        if (cohort?.startDate) {
          const weeksPassed = getWeeksPassed(cohort.startDate);
          engagementScore = calculateEngagementScore(submissionCount, weeksPassed);
          engagementLevel = getEngagementLevel(engagementScore);
        }

        // 활동 상태 계산
        const lastActivityAt = safeTimestampToDate(participantData.lastActivityAt);
        let activityStatus: 'active' | 'moderate' | 'dormant' = 'dormant';
        if (lastActivityAt) {
          const daysSinceActivity = Math.floor((now - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
          activityStatus = getParticipantStatus(daysSinceActivity);
        }

        return {
          ...sanitizeParticipantForClient({ id: doc.id, ...participantData }),
          cohortName,
          submissionCount,
          engagementScore,
          engagementLevel,
          hasPushToken: !!participantData.pushToken,
          activityStatus,
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
