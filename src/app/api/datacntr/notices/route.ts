import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // 모든 공지사항 조회 (최신순)
    const noticesSnapshot = await db
      .collection(COLLECTIONS.NOTICES)
      .orderBy('createdAt', 'desc')
      .get();

    // 코호트 정보 맵 생성
    const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
    const cohortsMap = new Map();
    cohortsSnapshot.docs.forEach((doc) => {
      cohortsMap.set(doc.id, doc.data().name);
    });

    // 공지사항에 코호트명 추가
    const noticesWithCohort = noticesSnapshot.docs.map((doc) => {
      const noticeData = doc.data();

      return {
        id: doc.id,
        ...noticeData,
        cohortName: cohortsMap.get(noticeData.cohortId) || '알 수 없음',
      };
    });

    return NextResponse.json(noticesWithCohort);
  } catch (error) {

    return NextResponse.json(
      { error: '공지사항 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
