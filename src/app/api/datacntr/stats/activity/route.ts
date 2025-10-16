import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { format, subDays, endOfDay } from 'date-fns';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import type { DailyActivity } from '@/types/datacntr';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const { email, uid, error } = await requireAuthToken(request);
    if (error) {
      return error;
    }

    // days 파라미터 (기본 7일)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);

    const db = getAdminDb();
    const now = new Date();

    // 지난 N일 데이터 조회
    const startDate = subDays(now, days);
    startDate.setHours(0, 0, 0, 0);

    // 독서 인증 & 전체 참가자 조회 (Admin SDK)
    const [submissionsSnapshot, allParticipantsSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.READING_SUBMISSIONS).where('submittedAt', '>=', startDate).get(),
      db.collection(COLLECTIONS.PARTICIPANTS).get(), // 푸시 허용 수 계산용
    ]);

    // 관리자 ID 목록 생성
    const adminIds = new Set(
      allParticipantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isAdministrator === true;
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

    // 날짜 초기화 (최근 N일)
    for (let i = 0; i < days; i++) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      // 그날의 마지막 시각 (23:59:59)까지 포함
      const endOfDayDate = endOfDay(date);

      // 그날까지 푸시 허용한 참가자 수 (누적)
      const pushEnabledCount = allParticipantsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        // 관리자 제외
        if (data.isAdministrator) return false;
        // 푸시 토큰 있음
        if (!data.pushToken) return false;
        // 그날까지 가입한 참가자 (그날 늦게 가입한 사용자도 포함)
        const createdAt = safeTimestampToDate(data.createdAt);
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

    // 독서 인증 집계 (관리자 제외)
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      // 관리자 인증 제외
      if (adminIds.has(data.participantId)) return;

      const submittedAt = safeTimestampToDate(data.submittedAt);
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
