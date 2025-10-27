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
              docs: snap.docs.filter(d => participantIds.includes(d.data().participantId))
            };
          })
        : db.collection(COLLECTIONS.READING_SUBMISSIONS).where('submittedAt', '>=', startDate).get(),
      cohortId
        ? db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get()
        : db.collection(COLLECTIONS.PARTICIPANTS).get(),
    ]);

    // 슈퍼관리자 ID 목록 생성 (일반 관리자는 포함)
    const superAdminIds = new Set(
      allParticipantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isSuperAdmin === true;
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
    }>();

    // 날짜 초기화 (startDate ~ endDate 기간)
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      // 그날의 마지막 시각 (23:59:59)까지 포함
      const endOfDayDate = endOfDay(date);

      // 그날까지 푸시 허용한 참가자 수 (누적)
      const pushEnabledCount = allParticipantsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        // 슈퍼관리자만 제외 (일반 관리자는 포함)
        if (data.isSuperAdmin) return false;
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
      });
    }

    // 독서 인증 집계 (슈퍼관리자만 제외)
    submissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // 슈퍼관리자 인증만 제외 (일반 관리자는 포함)
      if (superAdminIds.has(data.participantId)) return;

      const submittedAt = safeTimestampToDate(data.submittedAt);
      if (!submittedAt) {
        logger.warn('제출 타임스탬프 누락', { docId: doc.id, submissionDate: data.submissionDate });
        return;
      }
      const date = format(submittedAt, 'yyyy-MM-dd');
      const activity = activityMap.get(date);

      if (activity) {
        activity.submissions += 1;
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
        submissions: activity.submissions,
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
    logger.error('활동 지표 조회 실패', error);
    return NextResponse.json(
      { error: '활동 지표 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
