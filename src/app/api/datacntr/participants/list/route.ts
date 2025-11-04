/**
 * GET /api/datacntr/participants/list?cohortId=xxx
 * 특정 코호트의 참가자 목록 조회
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
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId is required' },
        { status: 400 }
      );
    }

    const db = await getAdminDb();
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .orderBy('name', 'asc')
      .get();

    // 어드민, 슈퍼어드민, 고스트 제외 필터링
    const participants = participantsSnapshot.docs
      .filter((doc) => {
        const data = doc.data();
        return !data.isSuperAdmin && !data.isAdministrator && !data.isGhost;
      })
      .map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        role: doc.data().role || 'participant',
      }));

    return NextResponse.json({ participants });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}
