import { NextRequest, NextResponse } from 'next/server';
import { requireAuthToken } from '@/lib/api-auth';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { format, subDays } from 'date-fns';
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

    const db = getDb();
    const now = new Date();

    // 지난 N일 데이터 조회
    const startDate = subDays(now, days);
    startDate.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startDate);

    // 독서 인증 & 참가자 & 메시지 조회
    const [submissionsSnapshot, participantsSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.READING_SUBMISSIONS), where('submittedAt', '>=', startTimestamp))),
      getDocs(query(collection(db, COLLECTIONS.PARTICIPANTS), where('createdAt', '>=', startTimestamp))),
      getDocs(query(collection(db, COLLECTIONS.MESSAGES), where('createdAt', '>=', startTimestamp))),
    ]);

    // 날짜별로 그룹화
    const activityMap = new Map<string, DailyActivity>();

    // 날짜 초기화 (최근 N일)
    for (let i = 0; i < days; i++) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      activityMap.set(dateStr, {
        date: dateStr,
        submissions: 0,
        newParticipants: 0,
        messages: 0,
      });
    }

    // 독서 인증 집계
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = format(data.submittedAt.toDate(), 'yyyy-MM-dd');
      const activity = activityMap.get(date);
      if (activity) {
        activity.submissions += 1;
      }
    });

    // 신규 참가자 집계
    participantsSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = format(data.createdAt.toDate(), 'yyyy-MM-dd');
      const activity = activityMap.get(date);
      if (activity) {
        activity.newParticipants += 1;
      }
    });

    // 메시지 집계
    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = format(data.createdAt.toDate(), 'yyyy-MM-dd');
      const activity = activityMap.get(date);
      if (activity) {
        activity.messages += 1;
      }
    });

    // 배열로 변환 (최신순 정렬)
    const activities = Array.from(activityMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(activities);
  } catch (error) {
    logger.error('활동 지표 조회 실패', error);
    return NextResponse.json(
      { error: '활동 지표 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
