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

    // Cohort 정보 조회 (총 인증률 계산을 위해)
    let cohortData = null;
    let elapsedDays = 0;
    if (cohortId) {
      const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
      if (cohortDoc.exists) {
        cohortData = cohortDoc.data();
        // 경과 일수 계산 (시작일부터 오늘까지, 첫 날 OT 제외)
        const startDate = new Date(cohortData.startDate);
        const today = new Date(todayString);
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // OT 첫날 제외: daysDiff - 1 (최소 0일)
        // 예: 1월 1일(OT) 시작, 오늘 1월 5일 → daysDiff = 4, elapsedDays = 3 (인증 가능 일수: 1/2, 1/3, 1/4)
        elapsedDays = Math.max(0, daysDiff - 1);
      }
    }

    // 1. 참가자 조회 (cohortId 필터링)
    const participantsSnapshot = cohortId
      ? await db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get()
      : await db.collection(COLLECTIONS.PARTICIPANTS).get();

    // 슈퍼관리자만 제외 (일반 관리자는 통계에 포함)
    const nonSuperAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin;
    });

    // 슈퍼관리자 ID 목록 생성
    const superAdminIds = new Set(
      participantsSnapshot.docs
        .filter((doc) => doc.data().isSuperAdmin === true)
        .map((doc) => doc.id)
    );

    // 대상 참가자 ID 목록 (슈퍼관리자 제외)
    const targetParticipantIds = nonSuperAdminParticipants.map(doc => doc.id);

    // 2. 독서 인증, 공지사항, 메시지 조회 (participantId IN 쿼리 사용)
    const allSubmissions: any[] = [];
    const todaySubmissions: any[] = [];

    if (targetParticipantIds.length > 0) {
      // Firestore IN 제약: 최대 10개씩 분할 쿼리
      const chunkSize = 10;
      for (let i = 0; i < targetParticipantIds.length; i += chunkSize) {
        const chunk = targetParticipantIds.slice(i, i + chunkSize);

        // 전체 제출 (draft 제외)
        const submissionsChunk = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', 'in', chunk)
          .get();
        // draft 상태 제외 필터링 (IN 쿼리와 != 쿼리 동시 사용 불가로 클라이언트 필터)
        const nonDraftSubmissions = submissionsChunk.docs.filter(doc =>
          doc.data().status !== 'draft'
        );
        allSubmissions.push(...nonDraftSubmissions);

        // 오늘 제출 (draft 제외)
        const todayChunk = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', 'in', chunk)
          .where('submissionDate', '==', todayString)
          .get();
        // draft 상태 제외 필터링
        const nonDraftTodaySubmissions = todayChunk.docs.filter(doc =>
          doc.data().status !== 'draft'
        );
        todaySubmissions.push(...nonDraftTodaySubmissions);
      }
    }

    const [noticesSnapshot, messagesSnapshot] = await Promise.all([
      cohortId
        ? db.collection(COLLECTIONS.NOTICES).where('cohortId', '==', cohortId).get()
        : db.collection(COLLECTIONS.NOTICES).get(),
      db.collection(COLLECTIONS.MESSAGES).get(),
    ]);

    // 오늘 인증은 중복 제출을 방지하기 위해 참가자 기준으로 집계
    const nonSuperAdminTodaySubmissionIds = new Set<string>();
    todaySubmissions.forEach((doc) => {
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
              // draft 제외 필터링 추가
              docs: snap.docs.filter(d =>
                participantIds.includes(d.data().participantId) &&
                d.data().status !== 'draft'
              )
            };
          })
      : await db.collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('submittedAt', '>=', weekStart)
          .get()
          .then(snap => ({
            // draft 제외 필터링
            docs: snap.docs.filter(d => d.data().status !== 'draft')
          }));

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
      ? Math.round((allSubmissions.length / nonSuperAdminParticipants.length) * 10) / 10 // 소수점 1자리
      : 0;

    // 총 인증률 계산
    // 총 참가자 × 경과 일수 = 최대 가능 인증 수
    // 실제 인증 수 / 최대 가능 인증 수 × 100 = 총 인증률
    let totalSubmissionRate = 0;

    if (cohortId && elapsedDays > 0 && nonSuperAdminParticipants.length > 0) {
      // 단일 코호트 선택 시: 기존 로직 유지
      const maxPossibleSubmissions = nonSuperAdminParticipants.length * elapsedDays;
      totalSubmissionRate = Math.round((allSubmissions.length / maxPossibleSubmissions) * 100);
    } else if (!cohortId && nonSuperAdminParticipants.length > 0) {
      // 전체 보기 시: 각 참가자의 코호트별 경과 일수를 합산하여 계산
      const allCohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
      const cohortMap = new Map<string, { startDate: string }>();
      allCohortsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        cohortMap.set(doc.id, { startDate: data.startDate });
      });

      const today = new Date(todayString);
      let totalMaxSubmissions = 0;

      // 각 참가자별로 소속 코호트의 경과 일수 계산
      nonSuperAdminParticipants.forEach(participant => {
        const cohortInfo = cohortMap.get(participant.cohortId);
        if (cohortInfo) {
          const startDate = new Date(cohortInfo.startDate);
          const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const participantElapsedDays = Math.max(0, daysDiff - 1); // OT 첫날 제외
          totalMaxSubmissions += participantElapsedDays;
        }
      });

      if (totalMaxSubmissions > 0) {
        totalSubmissionRate = Math.round((allSubmissions.length / totalMaxSubmissions) * 100);
      }
    }

    const stats: OverviewStats = {
      averageSubmissionsPerParticipant,
      totalParticipants: nonSuperAdminParticipants.length,
      todaySubmissions: nonSuperAdminTodaySubmissionIds.size,
      totalSubmissions: allSubmissions.length,
      totalNotices: noticesSnapshot.size,
      totalMessages: messagesSnapshot.size,
      pushEnabledCount,
      activeParticipants,
      moderateParticipants,
      dormantParticipants,
      weeklyParticipationRate,
      totalSubmissionRate,
    };

    return NextResponse.json(stats);
  } catch (error) {

    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
