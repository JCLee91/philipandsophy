import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
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

    const db = getDb();

    // 오늘 날짜 (KST)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // 병렬로 통계 조회
    const [cohortsSnapshot, participantsSnapshot, submissionsSnapshot, todaySubmissionsSnapshot, noticesSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.COHORTS)),
      getDocs(collection(db, COLLECTIONS.PARTICIPANTS)),
      getDocs(collection(db, COLLECTIONS.READING_SUBMISSIONS)),
      getDocs(query(collection(db, COLLECTIONS.READING_SUBMISSIONS), where('submittedAt', '>=', todayTimestamp))),
      getDocs(collection(db, COLLECTIONS.NOTICES)),
      getDocs(collection(db, COLLECTIONS.MESSAGES)),
    ]);

    const stats: OverviewStats = {
      totalCohorts: cohortsSnapshot.size,
      totalParticipants: participantsSnapshot.size,
      todaySubmissions: todaySubmissionsSnapshot.size,
      totalSubmissions: submissionsSnapshot.size,
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
