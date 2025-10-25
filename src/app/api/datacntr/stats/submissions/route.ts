import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';

/**
 * 독서 인증 분석 통계 API
 */
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

    // 참가자 정보 조회 (관리자 필터링 + cohortId 맵핑)
    const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
    const adminIds = new Set<string>();
    const participantCohortMap = new Map<string, string>();

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.isSuperAdmin) {
        adminIds.add(doc.id);
      }
      participantCohortMap.set(doc.id, data.cohortId);
    });

    // 모든 독서 인증 조회
    const submissionsSnapshot = await db
      .collection(COLLECTIONS.READING_SUBMISSIONS)
      .get();

    // 관리자 제외 + cohortId 필터링
    const nonAdminSubmissions = submissionsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      const participantId = data.participantId;

      // 슈퍼관리자 제외
      if (adminIds.has(participantId)) {
        return false;
      }

      // cohortId 필터링 (있을 경우)
      if (cohortId) {
        const participantCohortId = participantCohortMap.get(participantId);
        if (participantCohortId !== cohortId) {
          return false;
        }
      }

      return true;
    });

    // 1. 시간대별 제출 분포
    const timeDistribution = {
      '06-09': 0,
      '09-12': 0,
      '12-15': 0,
      '15-18': 0,
      '18-21': 0,
      '21-24': 0,
      '00-06': 0, // 자정~새벽
    };

    // 2. 참가자별 인증 수 집계
    const participantSubmissions = new Map<string, number>();

    // 3. 리뷰 품질 데이터
    let totalReviewLength = 0;
    let longReviewCount = 0; // 200자 이상
    let hasDailyAnswerCount = 0; // 가치관 답변 작성
    const uniqueDates = new Set<string>();

    nonAdminSubmissions.forEach((doc) => {
      const data = doc.data();

      // 시간대별 분포
      const submittedAt = safeTimestampToDate(data.submittedAt);
      if (submittedAt) {
        const hour = submittedAt.getHours();
        if (hour >= 6 && hour < 9) timeDistribution['06-09']++;
        else if (hour >= 9 && hour < 12) timeDistribution['09-12']++;
        else if (hour >= 12 && hour < 15) timeDistribution['12-15']++;
        else if (hour >= 15 && hour < 18) timeDistribution['15-18']++;
        else if (hour >= 18 && hour < 21) timeDistribution['18-21']++;
        else if (hour >= 21 && hour < 24) timeDistribution['21-24']++;
        else timeDistribution['00-06']++;

        // 날짜 수집 (일일 평균 계산용)
        const dateKey = submittedAt.toISOString().split('T')[0];
        uniqueDates.add(dateKey);
      }

      // 참가자별 인증 수
      const participantId = data.participantId;
      if (participantId) {
        participantSubmissions.set(
          participantId,
          (participantSubmissions.get(participantId) || 0) + 1
        );
      }

      // 리뷰 품질
      const review = data.review || '';
      totalReviewLength += review.length;
      if (review.length >= 200) {
        longReviewCount++;
      }

      // 가치관 답변 작성 여부
      if (data.dailyAnswer && data.dailyAnswer.trim().length > 0) {
        hasDailyAnswerCount++;
      }
    });

    const totalSubmissions = nonAdminSubmissions.length;

    // 시간대별 백분율 계산
    const timeDistributionPercent = Object.entries(timeDistribution).map(([timeRange, count]) => ({
      timeRange,
      count,
      percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
    }));

    // 참여 지표
    const totalActiveParticipants = participantSubmissions.size;
    const dailyAverage = uniqueDates.size > 0
      ? Number((totalSubmissions / uniqueDates.size).toFixed(1))
      : 0;

    // 리뷰 품질 지표
    const averageReviewLength = totalSubmissions > 0 ? Math.round(totalReviewLength / totalSubmissions) : 0;
    const longReviewPercentage = totalSubmissions > 0 ? Math.round((longReviewCount / totalSubmissions) * 100) : 0;
    const dailyAnswerPercentage = totalSubmissions > 0 ? Math.round((hasDailyAnswerCount / totalSubmissions) * 100) : 0;

    return NextResponse.json({
      timeDistribution: timeDistributionPercent,
      participation: {
        totalSubmissions,
        totalActiveParticipants,
        dailyAverage,
        activeDays: uniqueDates.size,
      },
      reviewQuality: {
        averageReviewLength,
        longReviewPercentage,
        dailyAnswerPercentage,
      },
    });
  } catch (error) {
    logger.error('독서 인증 분석 조회 실패', error);
    return NextResponse.json(
      { error: '독서 인증 분석 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
