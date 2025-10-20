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

    // 모든 코호트 조회 (최신순)
    const cohortsSnapshot = await db
      .collection(COLLECTIONS.COHORTS)
      .orderBy('createdAt', 'desc')
      .get();

    const cohorts = cohortsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(cohorts);
  } catch (error) {
    logger.error('코호트 조회 실패 (datacntr-cohorts)', error);
    return NextResponse.json(
      { error: '코호트 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
