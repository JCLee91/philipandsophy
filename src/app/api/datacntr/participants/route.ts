import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { calculateEngagementScore, getEngagementLevel, getWeeksPassed } from '@/lib/datacntr/engagement';
import { sanitizeParticipantForClient } from '@/lib/datacntr/sanitize';
import { getParticipantStatus } from '@/lib/datacntr/status';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';
import type { DataCenterParticipant } from '@/types/datacntr';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // URL에서 cohortId 파라미터 추출
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

    // 참가자 조회 (cohortId 필터링 옵션)
    const participantsCollection = db.collection(COLLECTIONS.PARTICIPANTS);
    const participantsQuery = cohortId
      ? participantsCollection.where('cohortId', '==', cohortId)
      : participantsCollection;

    const participantsSnapshot = await participantsQuery
      .orderBy('createdAt', 'asc')
      .get();

    // 슈퍼 관리자 제외 필터링 (일반 관리자는 통계에 포함)
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin;
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
    const participantsWithStats: DataCenterParticipant[] = await Promise.all(
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

        // pushNotificationEnabled 필드 기준으로 푸시 알림 활성화 여부 확인
        const hasPushToken = participantData.pushNotificationEnabled === true;

        return {
          ...sanitizeParticipantForClient({ id: doc.id, ...participantData }),
          cohortName,
          submissionCount,
          engagementScore,
          engagementLevel,
          hasPushToken,
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
