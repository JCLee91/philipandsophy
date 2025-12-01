import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import type { OverviewStats } from '@/types/datacntr';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { getSubmissionDate } from '@/lib/date-utils';
import { hasAnyPushSubscription } from '@/lib/push/helpers';
import { format } from 'date-fns';

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

    // ✅ FIX: 새벽 2시 마감 정책 적용 (getSubmissionDate 사용)
    // 오늘 날짜 (KST) - submissionDate 필드를 사용해 타임존 이슈 제거
    const todayString = getSubmissionDate();

    // Cohort 정보 조회 (총 인증률 계산을 위해)
    let cohortData = null;
    let elapsedDays = 0;
    if (cohortId) {
      const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
      if (cohortDoc.exists) {
        cohortData = cohortDoc.data();
        // 경과 일수 계산 (시작일부터 오늘 또는 종료일까지, 첫 날 OT 제외)
        const startDate = new Date(cohortData.startDate);
        const endDate = new Date(cohortData.endDate);
        const today = new Date(todayString);
        // 종료된 기수는 종료일까지만 계산 (오늘이 종료일 이후면 종료일 사용)
        const compareDate = today > endDate ? endDate : today;
        const daysDiff = Math.floor((compareDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // OT 첫날 제외: daysDiff - 1 (최소 0일)
        // 예: 1월 1일(OT) 시작, 1월 5일 종료 → daysDiff = 4, elapsedDays = 3 (인증 가능 일수: 1/2, 1/3, 1/4)
        elapsedDays = Math.max(0, daysDiff - 1);
      }
    }

    // 1. 참가자 조회 (cohortId 필터링)
    const participantsSnapshot = cohortId
      ? await db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get()
      : await db.collection(COLLECTIONS.PARTICIPANTS).get();

    // 어드민, 슈퍼어드민, 고스트 제외
    const nonSuperAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin && !data.isAdministrator && !data.isGhost;
    });

    // 어드민, 슈퍼어드민, 고스트 ID 목록 생성
    const excludedIds = new Set(
      participantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isSuperAdmin === true || data.isAdministrator === true || data.isGhost === true;
        })
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

    // ✅ FIX: unique (participantId, submissionDate) 조합으로 카운트 (중복 제출 제거)
    // 정책상 하루 1회 인증이므로 같은 날 같은 사람의 여러 제출은 1회로 카운트
    const uniqueSubmissionKeys = new Set<string>();
    allSubmissions.forEach((doc) => {
      const data = doc.data();
      let submissionDate = data.submissionDate;
      if (!submissionDate) {
        // submissionDate가 없는 경우 submittedAt fallback (레거시 데이터 호환)
        const submittedAt = safeTimestampToDate(data.submittedAt);
        if (submittedAt) {
          submissionDate = format(submittedAt, 'yyyy-MM-dd');
        }
      }
      if (submissionDate) {
        // participantId + date 조합으로 unique key 생성
        uniqueSubmissionKeys.add(`${data.participantId}_${submissionDate}`);
      }
    });
    const uniqueSubmissionCount = uniqueSubmissionKeys.size;

    // 오늘 인증은 중복 제출을 방지하기 위해 참가자 기준으로 집계
    const nonSuperAdminTodaySubmissionIds = new Set<string>();
    todaySubmissions.forEach((doc) => {
      const data = doc.data();
      if (!excludedIds.has(data.participantId)) {
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

    // 이번 주 인증한 참가자 ID (슈퍼관리자 + 고스트 제외, 중복 제거)
    const weekParticipantIds = new Set<string>();
    weekSubmissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!excludedIds.has(data.participantId)) {
        weekParticipantIds.add(data.participantId);
      }
    });

    const weeklyParticipationRate = nonSuperAdminParticipants.length > 0
      ? Math.round((weekParticipantIds.size / nonSuperAdminParticipants.length) * 100)
      : 0;

    // 참가자당 평균 독서 인증 횟수 계산 (unique 인증 기준)
    const averageSubmissionsPerParticipant = nonSuperAdminParticipants.length > 0
      ? Math.round((uniqueSubmissionCount / nonSuperAdminParticipants.length) * 10) / 10 // 소수점 1자리
      : 0;

    // 총 인증률 계산
    // 총 참가자 × 경과 일수 = 최대 가능 인증 수
    // 실제 인증 수 / 최대 가능 인증 수 × 100 = 총 인증률
    let totalSubmissionRate = 0;

    if (cohortId && elapsedDays > 0 && nonSuperAdminParticipants.length > 0) {
      // 단일 코호트 선택 시 (unique 인증 기준)
      const maxPossibleSubmissions = nonSuperAdminParticipants.length * elapsedDays;
      totalSubmissionRate = Math.round((uniqueSubmissionCount / maxPossibleSubmissions) * 100);
    } else if (!cohortId && nonSuperAdminParticipants.length > 0) {
      // 전체 보기 시: 각 참가자의 코호트별 경과 일수를 합산하여 계산
      const allCohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
      const cohortMap = new Map<string, { startDate: string; endDate: string }>();
      allCohortsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        cohortMap.set(doc.id, { startDate: data.startDate, endDate: data.endDate });
      });

      const today = new Date(todayString);
      let totalMaxSubmissions = 0;

      // 각 참가자별로 소속 코호트의 경과 일수 계산
      nonSuperAdminParticipants.forEach(participant => {
        const participantData = participant.data();
        const cohortInfo = cohortMap.get(participantData.cohortId);
        if (cohortInfo) {
          const startDate = new Date(cohortInfo.startDate);
          const endDate = new Date(cohortInfo.endDate);
          // 종료된 기수는 종료일까지만 계산
          const compareDate = today > endDate ? endDate : today;
          const daysDiff = Math.floor((compareDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const participantElapsedDays = Math.max(0, daysDiff - 1); // OT 첫날 제외
          totalMaxSubmissions += participantElapsedDays;
        }
      });

      if (totalMaxSubmissions > 0) {
        totalSubmissionRate = Math.round((uniqueSubmissionCount / totalMaxSubmissions) * 100);
      }
    }

    const stats: OverviewStats = {
      averageSubmissionsPerParticipant,
      totalParticipants: nonSuperAdminParticipants.length,
      todaySubmissions: nonSuperAdminTodaySubmissionIds.size,
      totalSubmissions: uniqueSubmissionCount, // ✅ FIX: unique 인증 기준
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
