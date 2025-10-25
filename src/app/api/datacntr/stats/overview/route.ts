import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import type { OverviewStats } from '@/types/datacntr';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { getTodayString } from '@/lib/date-utils';
import { hasAnyPushSubscription } from '@/lib/push/helpers';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

    // 오늘 날짜 (KST) - submissionDate 필드를 사용해 타임존 이슈 제거
    const todayString = getTodayString();

    // 병렬로 통계 조회 (Admin SDK)
    const [participantsSnapshot, submissionsSnapshot, todaySubmissionsSnapshot, noticesSnapshot, messagesSnapshot] = await Promise.all([
      cohortId
        ? db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get()
        : db.collection(COLLECTIONS.PARTICIPANTS).get(),
      cohortId
        ? db.collection(COLLECTIONS.READING_SUBMISSIONS).get().then(async snap => {
            const participants = await db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get();
            const participantIds = participants.docs.map(d => d.id);
            return {
              docs: snap.docs.filter(d => participantIds.includes(d.data().participantId))
            };
          })
        : db.collection(COLLECTIONS.READING_SUBMISSIONS).get(),
      cohortId
        ? db.collection(COLLECTIONS.READING_SUBMISSIONS).where('submissionDate', '==', todayString).get().then(async snap => {
            const participants = await db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get();
            const participantIds = participants.docs.map(d => d.id);
            return {
              docs: snap.docs.filter(d => participantIds.includes(d.data().participantId))
            };
          })
        : db.collection(COLLECTIONS.READING_SUBMISSIONS).where('submissionDate', '==', todayString).get(),
      cohortId
        ? db.collection(COLLECTIONS.NOTICES).where('cohortId', '==', cohortId).get()
        : db.collection(COLLECTIONS.NOTICES).get(),
      db.collection(COLLECTIONS.MESSAGES).get(),
    ]);

    // 슈퍼관리자만 제외 (일반 관리자는 통계에 포함)
    const nonSuperAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin;
    });

    // 슈퍼관리자 ID 목록 생성 (일반 관리자는 포함 안함)
    const superAdminIds = new Set(
      participantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isSuperAdmin === true;
        })
        .map((doc) => doc.id)
    );

    // 슈퍼관리자의 인증만 제외 (일반 관리자 인증은 포함)
    const nonSuperAdminSubmissions = submissionsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !superAdminIds.has(data.participantId);
    });

    // 오늘 인증은 중복 제출을 방지하기 위해 참가자 기준으로 집계
    const nonSuperAdminTodaySubmissionIds = new Set<string>();
    todaySubmissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!superAdminIds.has(data.participantId)) {
        nonSuperAdminTodaySubmissionIds.add(data.participantId);
      }
    });

    // 푸시 알림 허용 인원 (슈퍼관리자만 제외)
    const pushEnabledCount = nonSuperAdminParticipants.filter((doc) => {
      const data = doc.data();
      return hasAnyPushSubscription(data);
    }).length;

    // 참가자 활동 상태 분류 (3일 이내 / 4-7일 / 7일 이상, 슈퍼관리자만 제외)
    const now = Date.now();
    let activeParticipants = 0;
    let moderateParticipants = 0;
    let dormantParticipants = 0;

    nonSuperAdminParticipants.forEach((doc) => {
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

    // 주간 참여율 계산 (이번 주 인증 참가자 비율, 슈퍼관리자만 제외)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 이번 주 일요일
    weekStart.setHours(0, 0, 0, 0);

    const weekSubmissionsSnapshot = cohortId
      ? await db.collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('submittedAt', '>=', weekStart)
          .get()
          .then(async snap => {
            const participants = await db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get();
            const participantIds = participants.docs.map(d => d.id);
            return {
              docs: snap.docs.filter(d => participantIds.includes(d.data().participantId))
            };
          })
      : await db.collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('submittedAt', '>=', weekStart)
          .get();

    // 이번 주 인증한 참가자 ID (슈퍼관리자만 제외, 중복 제거)
    const weekParticipantIds = new Set<string>();
    weekSubmissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!superAdminIds.has(data.participantId)) {
        weekParticipantIds.add(data.participantId);
      }
    });

    const weeklyParticipationRate = nonSuperAdminParticipants.length > 0
      ? Math.round((weekParticipantIds.size / nonSuperAdminParticipants.length) * 100)
      : 0;

    // 참가자당 평균 독서 인증 횟수 계산
    const averageSubmissionsPerParticipant = nonSuperAdminParticipants.length > 0
      ? Math.round((nonSuperAdminSubmissions.length / nonSuperAdminParticipants.length) * 10) / 10 // 소수점 1자리
      : 0;

    const stats: OverviewStats = {
      averageSubmissionsPerParticipant,
      totalParticipants: nonSuperAdminParticipants.length,
      todaySubmissions: nonSuperAdminTodaySubmissionIds.size,
      totalSubmissions: nonSuperAdminSubmissions.length,
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
