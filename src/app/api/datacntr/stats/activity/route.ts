import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { format, subDays, endOfDay, parseISO, differenceInDays, addDays } from 'date-fns';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import type { DailyActivity } from '@/types/datacntr';

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

    // days, cohortId 파라미터
    const searchParams = request.nextUrl.searchParams;
    const cohortId = searchParams.get('cohortId');

    const db = getAdminDb();
    const now = new Date();

    // 코호트 정보 조회 (cohortId가 있으면)
    let startDate: Date;
    let endDate: Date;
    let totalDays: number;

    if (cohortId) {
      const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();

      if (!cohortDoc.exists) {
        return NextResponse.json(
          { error: '코호트를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      const cohortData = cohortDoc.data();
      const cohortStartDate = parseISO(cohortData.startDate); // ISO 8601 문자열 → Date
      const cohortEndDate = parseISO(cohortData.endDate);

      // 코호트 시작일~종료일 기간 사용
      startDate = new Date(cohortStartDate);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(cohortEndDate);
      endDate.setHours(23, 59, 59, 999);

      // 총 일수 계산 (첫 날 OT 제외)
      // differenceInDays는 마지막 날을 포함하지 않으므로, +1을 하되 OT 제외를 위해 그대로 유지
      // 예: 1월 1일(OT) ~ 1월 5일 → differenceInDays = 4 (실제 인증 가능 일수: 1/2, 1/3, 1/4, 1/5 = 4일)
      totalDays = differenceInDays(endDate, startDate); // OT 제외: 시작일 미포함
    } else {
      // cohortId가 없으면 기존 방식 (최근 N일)
      const days = parseInt(searchParams.get('days') || '7', 10);
      startDate = subDays(now, days);
      startDate.setHours(0, 0, 0, 0);
      endDate = now;
      totalDays = days;
    }

    // 독서 인증 & 전체 참가자 조회 (cohortId 필터링)
    const [submissionsSnapshot, allParticipantsSnapshot] = await Promise.all([
      cohortId
        ? db.collection(COLLECTIONS.READING_SUBMISSIONS).where('submittedAt', '>=', startDate).get().then(async snap => {
            const participants = await db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get();
            const participantIds = participants.docs.map(d => d.id);
            return {
              // ✅ draft 제외: 활동 그래프에 임시저장 데이터 제외
              docs: snap.docs.filter(d =>
                participantIds.includes(d.data().participantId) &&
                d.data().status !== 'draft'
              )
            };
          })
        : db.collection(COLLECTIONS.READING_SUBMISSIONS)
            .where('submittedAt', '>=', startDate)
            .get()
            .then(snap => ({
              // ✅ draft 제외: 전체 보기 시에도 임시저장 데이터 제외
              docs: snap.docs.filter(d => d.data().status !== 'draft')
            })),
      cohortId
        ? db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get()
        : db.collection(COLLECTIONS.PARTICIPANTS).get(),
    ]);

    // 어드민, 슈퍼어드민, 고스트 ID 목록 생성
    const excludedIds = new Set(
      allParticipantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isSuperAdmin === true || data.isAdministrator === true || data.isGhost === true;
        })
        .map((doc) => doc.id)
    );

    // 날짜별로 그룹화
    const activityMap = new Map<string, {
      date: string;
      pushEnabled: number;
      submissions: number;
      totalReviewLength: number;
      totalAnswerLength: number;
      submissionCount: number;
      participantIds: Set<string>; // ✅ FIX: unique 참가자 추적
    }>();

    // 날짜 초기화 (startDate ~ endDate 기간)
    // i = 1부터 시작: OT 첫날 제외
    // i <= totalDays: 마지막 날 포함
    for (let i = 1; i <= totalDays; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      // 그날의 마지막 시각 (23:59:59)까지 포함
      const endOfDayDate = endOfDay(date);

      // 그날까지 푸시 허용한 참가자 수 (누적)
      const pushEnabledCount = allParticipantsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        // 어드민, 슈퍼어드민, 고스트 제외
        if (data.isSuperAdmin || data.isAdministrator || data.isGhost) return false;
        // 푸시 구독/토큰 확인
        if (!hasAnyPushSubscription(data)) return false;
        // 그날까지 가입한 참가자 (그날 늦게 가입한 사용자도 포함)
        const createdAt = safeTimestampToDate(data.createdAt);
        if (!createdAt) {
          return false;
        }
        return createdAt <= endOfDayDate;
      }).length;

      activityMap.set(dateStr, {
        date: dateStr,
        pushEnabled: pushEnabledCount,
        submissions: 0,
        totalReviewLength: 0,
        totalAnswerLength: 0,
        submissionCount: 0,
        participantIds: new Set<string>(), // ✅ FIX: unique 참가자 추적
      });
    }

    // 독서 인증 집계 (어드민, 슈퍼어드민, 고스트 제외)
    // ✅ FIX: submittedAt 대신 submissionDate 필드 사용 (새벽 2시 마감 정책 일관성)
    submissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // 어드민, 슈퍼어드민, 고스트 제외
      if (excludedIds.has(data.participantId)) return;

      // submissionDate 필드 사용 (새벽 2시 마감 정책이 적용된 날짜)
      let date = data.submissionDate;
      if (!date) {
        // submissionDate가 없는 경우 submittedAt fallback (레거시 데이터 호환)
        const submittedAt = safeTimestampToDate(data.submittedAt);
        if (!submittedAt) return;
        date = format(submittedAt, 'yyyy-MM-dd');
      }
      const activity = activityMap.get(date);

      if (activity) {
        // ✅ FIX: unique participantId로 카운트 (Overview API와 일관성)
        activity.participantIds.add(data.participantId);
        activity.submissionCount += 1;

        // 리뷰 길이 집계
        const review = data.review || '';
        activity.totalReviewLength += review.length;

        // 가치관 답변 길이 집계
        const dailyAnswer = data.dailyAnswer || '';
        activity.totalAnswerLength += dailyAnswer.length;
      }
    });

    // 배열로 변환 및 평균 계산
    const activities: DailyActivity[] = Array.from(activityMap.values())
      .map((activity) => ({
        date: activity.date,
        pushEnabled: activity.pushEnabled,
        submissions: activity.participantIds.size, // ✅ FIX: unique 참가자 수
        avgReviewLength: activity.submissionCount > 0
          ? Math.round(activity.totalReviewLength / activity.submissionCount)
          : 0,
        avgAnswerLength: activity.submissionCount > 0
          ? Math.round(activity.totalAnswerLength / activity.submissionCount)
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(activities);
  } catch (error) {

    return NextResponse.json(
      { error: '활동 지표 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
