import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { calculateEngagementScore, getEngagementLevel, getWeeksPassed } from '@/lib/datacntr/engagement';
import { sanitizeParticipantForClient } from '@/lib/datacntr/sanitize';
import { getParticipantStatus } from '@/lib/datacntr/status';
import { filterDatacntrParticipant } from '@/lib/datacntr/participant-filter';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';
import type { DataCenterParticipant } from '@/types/datacntr';
import { format } from 'date-fns';

function hasAnyPushSubscription(data: any): boolean {
  const hasMultiDeviceToken =
    Array.isArray(data.pushTokens) &&
    data.pushTokens.some(
      (entry: any) => typeof entry?.token === 'string' && entry.token.trim().length > 0
    );

  const hasWebPushSubscription =
    Array.isArray(data.webPushSubscriptions) &&
    data.webPushSubscriptions.some(
      (sub: any) => typeof sub?.endpoint === 'string' && sub.endpoint.trim().length > 0
    );

  const hasLegacyToken = typeof data.pushToken === 'string' && data.pushToken.trim().length > 0;

  return hasMultiDeviceToken || hasWebPushSubscription || hasLegacyToken;
}

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // URL에서 쿼리 파라미터 추출
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

    // 어드민, 슈퍼어드민, 고스트 제외 + status 필터링
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return filterDatacntrParticipant(data);
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

    // 모든 참가자 ID 수집
    const participantIds = nonAdminParticipants.map(doc => doc.id);

    // ✅ FIX: 인증 횟수를 unique (participantId, submissionDate) 기준으로 집계
    // Map<participantId, Set<submissionDate>> 구조로 중복 제거
    const submissionDatesMap = new Map<string, Set<string>>();
    if (participantIds.length > 0) {
      // Firestore IN 제약: 최대 10개씩 분할 쿼리
      const chunkSize = 10;
      for (let i = 0; i < participantIds.length; i += chunkSize) {
        const chunk = participantIds.slice(i, i + chunkSize);
        const submissionsSnapshot = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', 'in', chunk)
          .get();

        submissionsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          // draft 제외: 임시저장은 인증 횟수에 포함하지 않음
          if (data.status === 'draft') return;

          const participantId = data.participantId;
          let submissionDate = data.submissionDate;
          if (!submissionDate) {
            // submissionDate가 없는 경우 submittedAt fallback (레거시 데이터 호환)
            const submittedAt = safeTimestampToDate(data.submittedAt);
            if (submittedAt) {
              submissionDate = format(submittedAt, 'yyyy-MM-dd');
            }
          }

          if (submissionDate) {
            if (!submissionDatesMap.has(participantId)) {
              submissionDatesMap.set(participantId, new Set());
            }
            submissionDatesMap.get(participantId)!.add(submissionDate);
          }
        });
      }
    }

    // 각 참가자의 인게이지먼트, 활동 상태 추가
    const now = Date.now();
    const participantsWithStats: DataCenterParticipant[] = nonAdminParticipants.map((doc) => {
      const participantData = doc.data();

      // ✅ FIX: unique 날짜 수로 인증 횟수 조회
      const submissionCount = submissionDatesMap.get(doc.id)?.size || 0;

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

      // 실제 푸시 토큰 존재 여부 확인
      const hasPushToken = hasAnyPushSubscription(participantData);

      return {
        ...sanitizeParticipantForClient({ id: doc.id, ...participantData }),
        cohortName,
        submissionCount,
        engagementScore,
        engagementLevel,
        hasPushToken,
        activityStatus,
      };
    });

    return NextResponse.json(participantsWithStats);
  } catch (error) {

    return NextResponse.json(
      { error: '참가자 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
