import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import type { OverviewStats } from '@/types/datacntr';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { getTodayString } from '@/lib/date-utils';

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

    // 오늘 날짜 (KST) - submissionDate 필드를 사용해 타임존 이슈 제거
    const todayString = getTodayString();

    // 병렬로 통계 조회 (Admin SDK)
    const [cohortsSnapshot, participantsSnapshot, submissionsSnapshot, todaySubmissionsSnapshot, noticesSnapshot, messagesSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.COHORTS).get(),
      db.collection(COLLECTIONS.PARTICIPANTS).get(),
      db.collection(COLLECTIONS.READING_SUBMISSIONS).get(),
      db
        .collection(COLLECTIONS.READING_SUBMISSIONS)
        .where('submissionDate', '==', todayString)
        .get(),
      db.collection(COLLECTIONS.NOTICES).get(),
      db.collection(COLLECTIONS.MESSAGES).get(),
    ]);

    // 관리자 제외 필터링
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !(data.isSuperAdmin || data.isAdministrator);
    });

    // 관리자 ID 목록 생성
    const adminIds = new Set(
      participantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isSuperAdmin === true || data.isAdministrator === true;
        })
        .map((doc) => doc.id)
    );

    // 관리자의 인증 제외
    const nonAdminSubmissions = submissionsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !adminIds.has(data.participantId);
    });

    // 오늘 인증은 중복 제출을 방지하기 위해 참가자 기준으로 집계
    const nonAdminTodaySubmissionIds = new Set<string>();
    todaySubmissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!adminIds.has(data.participantId)) {
        nonAdminTodaySubmissionIds.add(data.participantId);
      }
    });

    // 푸시 알림 허용 인원 (관리자 제외)
    const pushEnabledCount = nonAdminParticipants.filter((doc) => {
      const data = doc.data();
      return hasAnyPushSubscription(data);
    }).length;

    // 참가자 활동 상태 분류 (3일 이내 / 4-7일 / 7일 이상)
    const now = Date.now();
    let activeParticipants = 0;
    let moderateParticipants = 0;
    let dormantParticipants = 0;

    nonAdminParticipants.forEach((doc) => {
      const data = doc.data();
      const lastActivityAt = safeTimestampToDate(data.lastActivityAt);

      if (!lastActivityAt) {
        dormantParticipants++;
        return;
      }

      const daysSinceActivity = Math.floor((now - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceActivity <= ACTIVITY_THRESHOLDS.ACTIVE_DAYS) {
        activeParticipants++;
      } else if (daysSinceActivity <= ACTIVITY_THRESHOLDS.MODERATE_DAYS) {
        moderateParticipants++;
      } else {
        dormantParticipants++;
      }
    });

    // 주간 참여율 계산 (이번 주 인증 참가자 비율)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 이번 주 일요일
    weekStart.setHours(0, 0, 0, 0);

    const weekSubmissionsSnapshot = await db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .where('submittedAt', '>=', weekStart)
      .get();

    // 이번 주 인증한 참가자 ID (관리자 제외, 중복 제거)
    const weekParticipantIds = new Set<string>();
    weekSubmissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!adminIds.has(data.participantId)) {
        weekParticipantIds.add(data.participantId);
      }
    });

    const weeklyParticipationRate = nonAdminParticipants.length > 0
      ? Math.round((weekParticipantIds.size / nonAdminParticipants.length) * 100)
      : 0;

    const stats: OverviewStats = {
      totalCohorts: cohortsSnapshot.size,
      totalParticipants: nonAdminParticipants.length,
      todaySubmissions: nonAdminTodaySubmissionIds.size,
      totalSubmissions: nonAdminSubmissions.length,
      totalNotices: noticesSnapshot.size,
      totalMessages: messagesSnapshot.size,
      pushEnabledCount,
      activeParticipants,
      moderateParticipants,
      dormantParticipants,
      weeklyParticipationRate,
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('통계 조회 실패', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
