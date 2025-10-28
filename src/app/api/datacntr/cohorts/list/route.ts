/**
 * GET /api/datacntr/cohorts/list
 * 코호트 목록 조회 (커스텀 알림용)
 * 🔒 관리자 인증 필요
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAuthToken } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // 🔒 관리자 인증 확인
  const authResult = await requireAuthToken(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const db = await getAdminDb();
    const cohortsSnapshot = await db
      .collection('cohorts')
      .orderBy('createdAt', 'desc')
      .get();

    const cohorts = cohortsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      isActive: doc.data().isActive || false,
    }));

    return NextResponse.json({ cohorts });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch cohorts' },
      { status: 500 }
    );
  }
}
