import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import type { OverviewStats } from '@/types/datacntr';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const { email, uid, error } = await requireAuthToken(request);
    if (error) {
      return error;
    }

    const db = getAdminDb();

    // 오늘 날짜 (KST) - Admin SDK는 Timestamp 자동 처리
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 병렬로 통계 조회 (Admin SDK)
    const [cohortsSnapshot, participantsSnapshot, submissionsSnapshot, todaySubmissionsSnapshot, noticesSnapshot, messagesSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.COHORTS).get(),
      db.collection(COLLECTIONS.PARTICIPANTS).get(),
      db.collection(COLLECTIONS.READING_SUBMISSIONS).get(),
      db.collection(COLLECTIONS.READING_SUBMISSIONS).where('submittedAt', '>=', today).get(),
      db.collection(COLLECTIONS.NOTICES).get(),
      db.collection(COLLECTIONS.MESSAGES).get(),
    ]);

    // 관리자 제외 필터링
    const nonAdminParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isAdmin && !data.isAdministrator;
    });

    // 관리자 ID 목록 생성
    const adminIds = new Set(
      participantsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.isAdmin || data.isAdministrator;
        })
        .map((doc) => doc.id)
    );

    // 관리자의 인증 제외
    const nonAdminSubmissions = submissionsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !adminIds.has(data.participantId);
    });

    const nonAdminTodaySubmissions = todaySubmissionsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !adminIds.has(data.participantId);
    });

    const stats: OverviewStats = {
      totalCohorts: cohortsSnapshot.size,
      totalParticipants: nonAdminParticipants.length,
      todaySubmissions: nonAdminTodaySubmissions.length,
      totalSubmissions: nonAdminSubmissions.length,
      totalNotices: noticesSnapshot.size,
      totalMessages: messagesSnapshot.size,
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
